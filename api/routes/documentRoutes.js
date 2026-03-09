const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const auth = require('../middleware/authMiddleware'); // Optional: Protect routes

// All routes are protected
// router.use(auth); // Uncomment to enforce auth on all document routes

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document management APIs
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get all documents
 *     tags: [Documents]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by document type
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: List of documents
 */
router.get('/', documentController.getDocuments);

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Add a new document
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - donnees
 *             properties:
 *               type:
 *                 type: string
 *               donnees:
 *                 type: object
 *     responses:
 *       200:
 *         description: Document added successfully
 */
router.post('/', documentController.addDocument);

/**
 * @swagger
 * /documents/{id}:
 *   put:
 *     summary: Update a document
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Document updated
 */
router.put('/:id', documentController.updateDocument);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Delete a document
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted
 */
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
