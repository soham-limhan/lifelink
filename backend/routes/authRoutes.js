const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { admin, db } = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_here_change_me_later';

// Register User/Ambulance
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    if (!name || !phone || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not initialized (check Firebase config in .env)' });
    }

    // Check if user already exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', phone).get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object
    const newUser = {
      name,
      phone,
      password: hashedPassword,
      role, // 'user' or 'ambulance'
      createdAt: new Date().toISOString()
    };

    // Save to Firestore
    const docRef = await usersRef.add(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: docRef.id, phone: newUser.phone, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: docRef.id,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    let errorMsg = 'Internal server error during registration';
    if (error.message && (error.message.includes('NOT_FOUND') || error.message.includes('PERMISSION_DENIED') || error.message.includes('does not contain an active Cloud Datastore'))) {
      errorMsg = 'Firebase error. Have you clicked "Create Database" in your Firebase Firestore console?';
    }
    res.status(500).json({ error: errorMsg, details: error.message });
  }
});

// Login User/Ambulance
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    // Find user by phone
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', phone).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    let userData;
    let docId;
    snapshot.forEach(doc => {
      userData = doc.data();
      docId = doc.id;
    });

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: docId, phone: userData.phone, role: userData.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: docId,
        name: userData.name,
        phone: userData.phone,
        role: userData.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    let errorMsg = 'Internal server error during login';
    if (error.message && (error.message.includes('NOT_FOUND') || error.message.includes('PERMISSION_DENIED') || error.message.includes('does not contain an active Cloud Datastore'))) {
      errorMsg = 'Firebase error. Have you clicked "Create Database" in your Firebase Firestore console?';
    }
    res.status(500).json({ error: errorMsg, details: error.message });
  }
});

// Google Auth Verification
router.post('/google', async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Missing Google ID Token' });
    if (!admin || !db) return res.status(500).json({ error: 'Database not initialized' });

    // 1. Verify Google token securely using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // 2. Lookup existing user in our Firestore system by email or uid
    const usersRef = db.collection('users');
    let snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      snapshot = await usersRef.where('uid', '==', uid).get();
    }

    let userData;
    let docId;

    if (snapshot.empty) {
      // 3. User does not exist, auto-register them
      if (!role) {
        return res.status(400).json({ error: 'Role is required for first-time Google sign-in' });
      }

      userData = {
        uid,
        email,
        name: name || 'Google User',
        phone: '', // Google might not provide phone
        role,
        picture: picture || '',
        createdAt: new Date().toISOString()
      };
      
      const docRef = await usersRef.add(userData);
      docId = docRef.id;
    } else {
      // 4. User exists, grab their data
      snapshot.forEach(doc => {
        userData = doc.data();
        docId = doc.id;
      });
    }

    // 5. Generate our custom Express JWT to sync with the rest of the app
    const token = jwt.sign(
      { id: docId, email: userData.email, role: userData.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Google authentication successful',
      token,
      user: {
        id: docId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        picture: userData.picture || ''
      }
    });

  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(401).json({ error: 'Invalid Google Identity Token', details: error.message });
  }
});

module.exports = router;
