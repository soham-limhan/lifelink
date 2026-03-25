const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Protect routes middleware (basic check)
const protect = (req, res, next) => {
  // In a full production app, you'd extract and verify the JWT token here.
  // We will assume the frontend handles passing user data or we extract it from headers.
  next();
};

// @route   POST /api/emergency/request
// @desc    User sends an emergency ping
router.post('/request', protect, async (req, res) => {
  try {
    const { userId, name, phone, location } = req.body;

    if (!userId || !name || !phone) {
      return res.status(400).json({ error: 'Missing user details for emergency request' });
    }
    
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const emergenciesRef = db.collection('emergencies');
    
    const newEmergency = {
      userId,
      name,
      phone,
      location: location || 'Unknown Location',
      status: 'pending', // 'pending', 'accepted', 'resolved'
      ambulanceId: null,
      createdAt: new Date().toISOString()
    };

    const docRef = await emergenciesRef.add(newEmergency);

    res.status(201).json({
      message: 'Emergency ping sent successfully',
      emergencyId: docRef.id,
      data: newEmergency
    });
  } catch (error) {
    console.error('Ping Error:', error);
    res.status(500).json({ error: 'Failed to send emergency ping' });
  }
});

// @route   GET /api/emergency/pending
// @desc    Ambulance fetches all pending emergency requests
router.get('/pending', protect, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const snapshot = await db.collection('emergencies')
                             .where('status', '==', 'pending')
                             .get();

    const emergencies = [];
    snapshot.forEach(doc => {
      emergencies.push({ id: doc.id, ...doc.data() });
    });

    // Sort in memory to avoid requiring a Firebase Composite Index
    emergencies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ emergencies });
  } catch (error) {
    console.error('Fetch Pending Error:', error);
    // Note: Firestore requires a composite index if you query 'status' and order by 'createdAt'.
    // If it fails with an index error, we'll see a distinct error URL in the console.
    res.status(500).json({ error: 'Failed to fetch pending emergencies', details: error.message });
  }
});

// @route   POST /api/emergency/accept/:id
// @desc    Ambulance accepts an emergency request
router.post('/accept/:id', protect, async (req, res) => {
  try {
    const emergencyId = req.params.id;
    const { ambulanceId } = req.body;

    if (!ambulanceId) {
      return res.status(400).json({ error: 'Ambulance ID is required' });
    }
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const emergencyRef = db.collection('emergencies').doc(emergencyId);
    const doc = await emergencyRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Emergency request not found' });
    }

    if (doc.data().status !== 'pending') {
      return res.status(400).json({ error: 'Emergency request already handled' });
    }

    await emergencyRef.update({
      status: 'accepted',
      ambulanceId,
      acceptedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Emergency request accepted successfully' });
  } catch (error) {
    console.error('Accept Error:', error);
    res.status(500).json({ error: 'Failed to accept emergency request' });
  }
});

// @route   GET /api/emergency/status/:id
// @desc    User polls the status of their emergency ping
router.get('/status/:id', protect, async (req, res) => {
  try {
    const emergencyId = req.params.id;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const emergencyRef = db.collection('emergencies').doc(emergencyId);
    const doc = await emergencyRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Emergency request not found' });
    }

    res.status(200).json({
      status: doc.data().status,
      ambulanceId: doc.data().ambulanceId,
      acceptedAt: doc.data().acceptedAt || null,
      ambulanceLocation: doc.data().ambulanceLocation || null
    });
  } catch (error) {
    console.error('Status Check Error:', error);
    res.status(500).json({ error: 'Failed to check emergency status' });
  }
});

// @route   POST /api/emergency/location/:id
// @desc    Ambulance continuously streams its GPS location
router.post('/location/:id', protect, async (req, res) => {
  try {
    const emergencyId = req.params.id;
    const { location } = req.body;
    
    if (!location) return res.status(400).json({ error: 'Missing location data' });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const emergencyRef = db.collection('emergencies').doc(emergencyId);
    await emergencyRef.update({
      ambulanceLocation: location,
      lastLocationUpdate: new Date().toISOString()
    });

    res.status(200).json({ message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// @route   POST /api/emergency/resolve/:id
// @desc    Ambulance marks the case as resolved
router.post('/resolve/:id', protect, async (req, res) => {
  try {
    const emergencyId = req.params.id;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const emergencyRef = db.collection('emergencies').doc(emergencyId);
    await emergencyRef.update({
      status: 'resolved',
      resolvedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Emergency marked as resolved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve emergency' });
  }
});

// @route   GET /api/emergency/history
// @desc    Fetch resolved emergencies for this ambulance
router.get('/history', protect, async (req, res) => {
  try {
    const { ambulanceId } = req.query; 
    if (!ambulanceId) return res.status(400).json({ error: 'Missing ambulanceId' });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const snapshot = await db.collection('emergencies')
                             .where('ambulanceId', '==', ambulanceId)
                             .where('status', '==', 'resolved')
                             .get();

    const history = [];
    snapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });

    // Sort descending by resolvedAt
    history.sort((a, b) => new Date(b.resolvedAt || 0) - new Date(a.resolvedAt || 0));

    res.status(200).json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
