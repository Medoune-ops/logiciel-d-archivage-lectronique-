const Document = require('../models/Document');

exports.getDocuments = async (req, res) => {
    try {
        const { type, query } = req.query;
        let filter = {};

        if (type) {
            filter.type = type;
        }

        // Add search logic if query exists
        // This is a basic implementation. For production, use text indexes or regex on specific fields.
        if (query) {
            // This is tricky with Mixed type. We might need to rely on specific known fields 
            // or client-side filtering if dataset is small.
            // For now, let's filter by documentName if it exists in donnees.
            // Accessing 'donnees.documentName' in query:
            filter['donnees.documentName'] = { $regex: query, $options: 'i' };
        }

        const documents = await Document.find(filter).sort({ dateAjout: -1 });
        res.json(documents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.addDocument = async (req, res) => {
    const { type, donnees } = req.body;

    try {
        const newDoc = new Document({
            type,
            donnees,
            createdBy: req.user ? req.user.id : null // Optional
        });

        const doc = await newDoc.save();
        res.json(doc);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        await doc.deleteOne();
        res.json({ message: 'Document removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateDocument = async (req, res) => {
    try {
        let doc = await Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        doc = await Document.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(doc);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
