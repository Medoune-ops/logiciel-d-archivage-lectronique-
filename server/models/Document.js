const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['cv', 'document-administratif', 'fiche-paie', 'liste-employes', 'liste-etudiants']
    },
    donnees: {
        type: Map, // Flexible schema for different document types
        of: mongoose.Schema.Types.Mixed,
        required: true
    },
    // We will use 'donnees' as a flexible object to store specific fields like 'documentName', 'file', etc.
    // Alternatively, we can use a strict schema if we know all fields.
    // Given the previous code used a loose structure, Map or Mixed is safer for now.
    // However, for better querying, we might want to promote common fields.

    // Let's refine: The frontend sends 'donnees' which contains everything including valid Base64 files.

    dateAjout: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional for now until auth is fully enforced
    }
});

module.exports = mongoose.model('Document', DocumentSchema);
