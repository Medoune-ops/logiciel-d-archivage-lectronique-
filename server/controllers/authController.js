const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
    console.log('Register request received:', req.body);
    const { nom, prenom, email, motDePasse, organisation, telephone } = req.body;

    try {
        // Validation
        if (!nom || !prenom || !email || !motDePasse) {
            console.log('Validation failed - missing fields');
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        console.log('Looking for existing user with email:', email);
        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists');
            return res.status(400).json({ message: 'User already exists' });
        }

        console.log('Creating new user...');
        user = new User({
            nom,
            prenom,
            email,
            telephone,
            organisation
        });

        console.log('Hashing password...');
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(motDePasse, salt);

        console.log('Saving user to database...');
        await user.save();
        console.log('User saved successfully, ID:', user.id);

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    throw err;
                }
               console.log('Registration successful!');
                res.json({ token, user: { id: user.id, nom, prenom, email, organisation, role: user.role } });
            }
        );
    } catch (err) {
        console.error('Registration error:', err.message);
        console.error('Stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, organisation: user.organisation, role: user.role } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
