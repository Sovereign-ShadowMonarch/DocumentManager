import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

axios.defaults.withCredentials = true;  
const API_URL = '54.152.189.90:5000';

const parseDate = (dateString: string): Date | null => {
  const [day, month, year] = dateString.split('-');
  if (day && month && year) {
    return new Date(`${year}-${month}-${day}`);
  }
  return null;
};

const determineDocumentStatus = (expirationDate: string): string => {
  const expDate = parseDate(expirationDate);
  if (!expDate) return 'Invalid Date';

  const days = Math.floor(
    (expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days < 0) return 'Overdue';
  if (days <= 30) return 'Expiring Soon';
  return 'Up-to-date';
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Overdue': return 'text-red-600';
    case 'Expiring Soon': return 'text-yellow-600';
    case 'Up-to-date': return 'text-green-600';
    default: return 'text-gray-600';
  }
};

const DocumentManager: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [documents, setDocuments] = useState<{
    _id: string;
    document_name: string;
    original_filename: string;
    expiration_date: string;
    status: string;
  }[]>([]);
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<{
    _id: string;
    document_name: string;
    expiration_date: string;
  } | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [newDocumentName, setNewDocumentName] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      fetchDocuments();
    }
  }, [isLoggedIn]);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents?username=${username}`);
      const docsWithStatus = response.data.map((doc: any) => ({
        ...doc,
        status: determineDocumentStatus(doc.expiration_date),
        expiration_date: doc.expiration_date === 'NOT PRESENT' ? '' : doc.expiration_date
      }));
      setDocuments(docsWithStatus);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    }
  };

  const handleLogin = async () => {
    try {
      await axios.post(`${API_URL}/login`, { username, password }, {
        withCredentials: true  
      });
      setIsLoggedIn(true);
      setLoginError('');
      await fetchDocuments();
    } catch (error: any) {
      setLoginError(error.response?.data?.error || 'Login failed');
    }
  };

  const handleSignup = async () => {
    try {
      await axios.post(`${API_URL}/signup`, {
        username: signupUsername,
        password: signupPassword
      },{
        withCredentials: true  // Add this
      });
      setSignupUsername('');
      setSignupPassword('');
      setIsSignup(false);
    } catch (error: any) {
      setSignupError(error.response?.data?.error || 'Signup failed');
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('username', username);

        const response = await axios.post(`${API_URL}/upload`, formData, {
           withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setDocuments(docs => [
          ...docs,
          {
            _id: response.data._id,
            document_name: response.data.document_name,
            original_filename: file.name,
            expiration_date: response.data.expiration_date,
            status: determineDocumentStatus(response.data.expiration_date)
          }
        ]);
      } catch (error) {
        console.error('Upload failed', error);
      }
    }
  };

  const handleReplaceDocument = async (document: {
    _id: string;
    document_name: string;
    expiration_date: string;
    original_filename: string;
  }) => {
    const file = await getFileFromUser();
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('username', username);

        const response = await axios.post(`${API_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setDocuments(docs => docs.map(doc =>
          doc._id === document._id
            ? {
              _id: doc._id,
              document_name: response.data.document_name,
              original_filename: file.name,
              expiration_date: response.data.expiration_date,
              status: determineDocumentStatus(response.data.expiration_date)
            }
            : doc
        ));
      } catch (error) {
        console.error('Replace failed', error);
      }
    }
  };

  const getFileFromUser = async (): Promise<File | null> => {
    return new Promise((resolve) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0] || null;
        resolve(file);
      };
      fileInput.click();
    });
  };

  const handleEditDocument = (document: {
    _id: string;
    document_name: string;
    expiration_date: string;
  }) => {
    setSelectedDocument(document);
    setNewDocumentName(document.document_name);
    setNewExpirationDate(parseDate(document.expiration_date)?.toISOString().substring(0, 10) || '');
  };

  const handleSaveChanges = async () => {
    try {
      if (selectedDocument) {
        const formattedDate = newExpirationDate.split('-').reverse().join('-');
        await axios.post(`${API_URL}/update_expiration`, {
          document_id: selectedDocument._id,
          expiration_date: formattedDate,
          document_name: newDocumentName
        }, { 
          withCredentials: true  // Add this
        });

        setDocuments(docs => docs.map(doc =>
          doc._id === selectedDocument._id
            ? {
                ...doc,
                document_name: newDocumentName,
                expiration_date: formattedDate,
                status: determineDocumentStatus(formattedDate)
              }
            : doc
        ));

        setSelectedDocument(null);
        setNewExpirationDate('');
        setNewDocumentName('');
      }
    } catch (error) {
      console.error('Failed to update document', error);
    }
  };

  const renderAuthPage = () => (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6">{isSignup ? 'Sign Up' : 'Login'}</h2>
        <div className="space-y-4">
          <Input
            type="text"
            value={isSignup ? signupUsername : username}
            onChange={(e) => isSignup ? setSignupUsername(e.target.value) : setUsername(e.target.value)}
            placeholder="Username"
          />
          <Input
            type="password"
            value={isSignup ? signupPassword : password}
            onChange={(e) => isSignup ? setSignupPassword(e.target.value) : setPassword(e.target.value)}
            placeholder="Password"
          />
          <Button onClick={isSignup ? handleSignup : handleLogin} className="w-full">
            {isSignup ? 'Sign Up' : 'Login'}
          </Button>
          {!isSignup && (
            <p className="text-center text-blue-600 cursor-pointer" onClick={() => setIsSignup(true)}>
              Create an account
            </p>
          )}
          {isSignup ? signupError && <p className="text-red-500">{signupError}</p> : loginError && <p className="text-red-500">{loginError}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {!isLoggedIn ? renderAuthPage() : (
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4 sm:mb-0">Document Dashboard</h1>
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <span className="text-gray-600">Welcome, <span className="font-bold text-blue-600">{username}</span></span>
              <Button
                variant="destructive"
                onClick={() => setIsLoggedIn(false)}
                className="bg-red-500 hover:bg-red-600 w-full sm:w-auto"
              >
                Sign Out
              </Button>
              <Input
                type="file"
                onChange={handleDocumentUpload}
                className="w-full sm:w-64"
              />
            </div>
          </div>

          {/* Encourage horizontal scrolling for document list */}
          <div className="bg-white shadow-xl rounded-xl overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-6 gap-4 bg-gray-100 font-semibold text-gray-700 p-4">
                <div>Document Name</div>
                <div>Expiration Date</div>
                <div>Status</div>
                <div>Days Until/Overdue</div>
                <div>Actions</div>
                <div>Replace</div>
              </div>
              {documents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No documents uploaded yet</div>
              ) : (
                documents.map((doc) => (
                  <div key={doc._id} className="grid grid-cols-6 gap-4 border-t p-4 items-center hover:bg-gray-50">
                    <div className="font-medium text-gray-800">{doc.document_name}</div>
                    <div className="text-gray-600">
                      {doc.expiration_date === ''
                        ? 'No Expiration'
                        : new Date(doc.expiration_date.split('-').reverse().join('-')).toLocaleDateString()}
                    </div>
                    <div className={`font-semibold ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </div>
                    <div className="text-gray-700">
                      {doc.expiration_date === ''
                        ? 'N/A'
                        : Math.abs(Math.floor(
                          (new Date(doc.expiration_date.split('-').reverse().join('-')).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                        ))}
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDocument(doc)}
                        className="hover:bg-blue-50 hover:text-blue-600"
                      >
                        Edit
                      </Button>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReplaceDocument(doc)}
                        className="hover:bg-blue-50 hover:text-blue-600"
                      >
                        Replace
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDocument && (
        <Dialog
          open={!!selectedDocument}
          onOpenChange={(open) => !open && setSelectedDocument(null)}
        >
          <DialogContent className="sm:max-w-[425px] bg-white rounded-xl shadow-2xl border-2 border-blue-100">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Edit Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-6 bg-white">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name
                </label>
                <Input
                  id="name"
                  value={newDocumentName}
                  onChange={(e) => setNewDocumentName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date
                </label>
                <Input
                  id="expiration"
                  type="date"
                  value={newExpirationDate}
                  onChange={(e) => setNewExpirationDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleSaveChanges}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentManager;
