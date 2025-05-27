    import express from 'express';
    import { mintHealthID, checkHealthID } from '../controllers/blockchainController.js';
    import { protect } from '../middleware/authmiddleware.js';

    const router = express.Router();

    // Route to mint a HealthID for a user (requires authentication)
    router.post('/mint-health-id', protect, mintHealthID);

    // Route to check if a user has a HealthID
    router.get('/check-health-id/:walletAddress', checkHealthID);

    export default router;