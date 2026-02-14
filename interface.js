/**
 * DARK - Electronic Archiving System
 * Refactored Architecture
 */

// Configuration
const CONFIG = {
    API_URL: 'http://localhost:5000/api',
    MOCK_MODE: false,
    STORAGE_KEYS: {
        USER: 'dark_user',
        TOKEN: 'dark_token',
        DOCUMENTS: 'dark_documents',
        USERS: 'dark_users_db'
    }
};

/**
 * Authentication Manager
 * Handles login, register, logout, and user session.
 */
class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.checkSession();
    }

    checkSession() {
        const storedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        const storedToken = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        if (storedUser && storedToken) {
            this.user = JSON.parse(storedUser);
            this.token = storedToken;
            return true;
        }
        return false;
    }

    isLoggedIn() {
        return !!this.user;
    }

    async login(email, password) {
        if (CONFIG.MOCK_MODE) {
            // Mock implementation (removed for brevity)
            return { success: false, message: 'Mock mode disabled' };
        } else {
            try {
                const res = await fetch(`${CONFIG.API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    this.startSession(data.user, data.token);
                    return { success: true };
                }
                return { success: false, message: data.message || 'Erreur de connexion' };
            } catch (err) {
                return { success: false, message: 'Erreur serveur' };
            }
        }
    }

    async register(userData) {
        if (CONFIG.MOCK_MODE) {
            return { success: false, message: 'Mock mode disabled' };
        } else {
            try {
                const res = await fetch(`${CONFIG.API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const data = await res.json();
                if (res.ok) {
                    return { success: true };
                }
                return { success: false, message: data.message || 'Erreur inscription' };
            } catch (err) {
                return { success: false, message: 'Erreur serveur' };
            }
        }
    }

    startSession(user, token) {
        this.user = user;
        this.token = token;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
        UIManager.updateUserInfo(user);
        UIManager.toggleAuthElements(true);
    }

    logout() {
        this.user = null;
        this.token = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        UIManager.updateUserInfo(null);
        UIManager.toggleAuthElements(false);
        UIManager.navigateTo('connexion');
        UIManager.showToast('Déconnexion réussie', 'info');
    }
}

/**
 * Document Manager
 * Handles CRUD operations for documents.
 */
class DocumentManager {
    constructor() {
        this.documents = [];
        // Delay load until we might have a token or just try
        setTimeout(() => this.loadDocuments(), 500);
    }

    async loadDocuments() {
        if (CONFIG.MOCK_MODE) {
            this.documents = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.DOCUMENTS)) || [];
        } else {
            try {
                const res = await fetch(`${CONFIG.API_URL}/documents`);
                if (res.ok) {
                    this.documents = await res.json();
                    UIManager.renderDocuments(this.documents);
                    UIManager.updateStats(this.documents);
                }
            } catch (e) {
                console.error('Failed to load docs', e);
            }
        }
    }

    async addDocument(docData) {
        if (CONFIG.MOCK_MODE) {
            // Mock
            return { success: false };
        } else {
            try {
                const res = await fetch(`${CONFIG.API_URL}/documents`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': window.app.auth.token
                    },
                    body: JSON.stringify(docData)
                });
                const data = await res.json();
                if (res.ok) {
                    this.documents.unshift(data); // Add to local list
                    return { success: true, document: data };
                }
                return { success: false, message: data.message };
            } catch (e) {
                return { success: false, message: 'Erreur réseau' };
            }
        }
    }

    async deleteDocument(id) {
        if (!CONFIG.MOCK_MODE) {
            try {
                const res = await fetch(`${CONFIG.API_URL}/documents/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-auth-token': window.app.auth.token }
                });
                if (res.ok) {
                    this.documents = this.documents.filter(d => d._id !== id); // MongoDB uses _id
                    this.saveLocal(); // Updates UI
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            this.documents = this.documents.filter(d => d.id !== id);
            this.saveLocal();
        }
    }

    saveLocal() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.DOCUMENTS, JSON.stringify(this.documents));
        UIManager.renderDocuments(this.documents);
        UIManager.updateStats(this.documents);
    }

    getDocumentsByCategory(category) {
        return this.documents.filter(d => d.type === category);
    }

    // Advanced Search
    search(query, category, dateStart, dateEnd) {
        return this.documents.filter(doc => {
            const matchesQuery = !query ||
                doc.donnees.documentName?.toLowerCase().includes(query.toLowerCase()) ||
                JSON.stringify(doc.donnees).toLowerCase().includes(query.toLowerCase());

            const matchesCategory = !category || doc.type === category;

            let matchesDate = true;
            const docDate = new Date(doc.createdAt);
            if (dateStart) matchesDate = matchesDate && docDate >= new Date(dateStart);
            if (dateEnd) matchesDate = matchesDate && docDate <= new Date(dateEnd);

            return matchesQuery && matchesCategory && matchesDate;
        });
    }
}

/**
 * UI Manager
 * Handles DOM manipulation, navigation, and rendering.
 */
class UIManager {
    static init() {
        this.sections = document.querySelectorAll('.section');
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.toastContainer = this.createToastContainer();
    }

    static createToastContainer() {
        const div = document.createElement('div');
        div.className = 'toast-container';
        div.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(div);
        return div;
    }

    static showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            padding: 1rem 1.5rem;
            border-radius: 8px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideInRight 0.3s ease;
            min-width: 250px;
        `;
        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static navigateTo(sectionId) {
        this.sections.forEach(s => {
            s.classList.toggle('active', s.id === sectionId);
            s.classList.toggle('hidden', s.id !== sectionId);
        });

        this.navButtons.forEach(b => {
            b.classList.toggle('active', b.id === `btn-${sectionId}`);
        });
    }

    static updateUserInfo(user) {
        const nameEl = document.getElementById('user-nom');
        const emailEl = document.getElementById('user-email');
        const orgEl = document.getElementById('user-organisation');

        if (user) {
            if (nameEl) nameEl.textContent = `${user.nom} ${user.prenom}`;
            if (emailEl) emailEl.textContent = user.email;
            if (orgEl) orgEl.textContent = user.organisation || '-';
        } else {
            if (nameEl) nameEl.textContent = '-';
            // ... clear others
        }
    }

    static toggleAuthElements(isLoggedIn) {
        const restrictedBtns = document.querySelectorAll('.restricted-auth');
        // Add logic to show/hide specific buttons based on auth state if needed
    }

    static renderDocuments(documents) {
        // Clear all categories first
        document.querySelectorAll('.folder-content').forEach(el => el.innerHTML = '');
        document.querySelectorAll('.document-count').forEach(el => el.textContent = '0');

        documents.forEach((doc, index) => {
            const container = document.getElementById(`folder-${doc.type}`);
            const counter = document.getElementById(`count-${doc.type}`);

            if (container) {
                const docId = doc._id || doc.id;
                const docEl = document.createElement('div');
                docEl.className = 'document-item';
                docEl.innerHTML = `
                    <div class="doc-info">
                        <i data-lucide="file-text" class="doc-icon"></i>
                        <div>
                            <strong>${doc.donnees.documentName || 'Sans titre'}</strong>
                            <span class="doc-date">${new Date(doc.createdAt || doc.dateAjout).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="doc-actions">
                        <button onclick="window.app.viewDocument('${docId}')" class="btn-icon" title="Voir"><i data-lucide="eye"></i></button>
                        <button onclick="window.app.deleteDocument('${docId}')" class="btn-icon btn-danger" title="Supprimer"><i data-lucide="trash-2"></i></button>
                    </div>
                `;
                container.appendChild(docEl);
            }

            if (counter) {
                counter.textContent = parseInt(counter.textContent) + 1;
            }
        });

        // Re-initialize Lucide icons for new content
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    static updateStats(documents) {
        const total = document.getElementById('total-documents');
        if (total) total.textContent = documents.length;
        // Update other stats...
    }
}

/**
 * Main Application Controller
 */
class App {
    constructor() {
        this.auth = new AuthManager();
        this.docs = new DocumentManager();
        this.init();
    }

    init() {
        UIManager.init();
        this.bindEvents();

        if (this.auth.isLoggedIn()) {
            UIManager.updateUserInfo(this.auth.user);
            UIManager.toggleAuthElements(true);
            UIManager.renderDocuments(this.docs.documents);
        } else {
            // Optional: Redirect if strict auth required
        }

        // Expose app for inline handlers
        window.app = this;
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.id.replace('btn-', '');
                if (['documents', 'parametres'].includes(target) && !this.auth.isLoggedIn()) {
                    UIManager.navigateTo('connexion');
                    UIManager.showToast('Veuillez vous connecter', 'warning');
                    return;
                }
                UIManager.navigateTo(target);
            });
        });

        // Auth Forms
        const loginForm = document.getElementById('form-connexion');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const res = await this.auth.login(fd.get('email'), fd.get('motDePasse'));
                if (res.success) {
                    UIManager.showToast('Connexion réussie !');
                    UIManager.navigateTo('dashboard');
                    UIManager.renderDocuments(this.docs.documents);
                } else {
                    UIManager.showToast(res.message, 'error');
                }
            });
        }

        const registerForm = document.getElementById('form-inscription');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const data = Object.fromEntries(fd.entries());
                const res = await this.auth.register(data);
                if (res.success) {
                    UIManager.showToast('Compte créé ! Connectez-vous.');
                    UIManager.navigateTo('connexion');
                } else {
                    UIManager.showToast(res.message, 'error');
                }
            });
        }

        // Navigation buttons for authentication flow
        const btnCommencer = document.getElementById('btn-commencer');
        if (btnCommencer) {
            btnCommencer.addEventListener('click', () => {
                UIManager.navigateTo('connexion');
            });
        }

        const btnVersInscription = document.getElementById('btn-vers-inscription');
        if (btnVersInscription) {
            btnVersInscription.addEventListener('click', () => {
                UIManager.navigateTo('inscription');
            });
        }

        const btnVersConnexion = document.getElementById('btn-vers-connexion');
        if (btnVersConnexion) {
            btnVersConnexion.addEventListener('click', () => {
                UIManager.navigateTo('connexion');
            });
        }

        const lienMotDePasseOublie = document.getElementById('lien-mot-de-passe-oublie');
        if (lienMotDePasseOublie) {
            lienMotDePasseOublie.addEventListener('click', (e) => {
                e.preventDefault();
                UIManager.navigateTo('mot-de-passe-oublie');
            });
        }

        const btnRetourConnexion = document.getElementById('btn-retour-connexion');
        if (btnRetourConnexion) {
            btnRetourConnexion.addEventListener('click', () => {
                UIManager.navigateTo('connexion');
            });
        }

        const btnConnexionRestreint = document.getElementById('btn-connexion-restreint');
        if (btnConnexionRestreint) {
            btnConnexionRestreint.addEventListener('click', () => {
                UIManager.navigateTo('connexion');
            });
        }

        const btnInscriptionRestreint = document.getElementById('btn-inscription-restreint');
        if (btnInscriptionRestreint) {
            btnInscriptionRestreint.addEventListener('click', () => {
                UIManager.navigateTo('inscription');
            });
        }

        const btnAnnulerReinitialisation = document.getElementById('btn-annuler-reinitialisation');
        if (btnAnnulerReinitialisation) {
            btnAnnulerReinitialisation.addEventListener('click', () => {
                UIManager.navigateTo('connexion');
            });
        }

        const btnDeconnexion = document.getElementById('btn-deconnexion');
        if (btnDeconnexion) {
            btnDeconnexion.addEventListener('click', () => {
                this.auth.logout();
            });
        }

        // Document Forms...
        // We will need to re-implement form generation logic or import it
        // For brevity in this refactor, I'm setting up the structure.
        // The detailed form generation functions from the original file should be adapted here
        // or kept as helper functions.

        this.setupDocumentForms();
        this.setupFooterVisibility();
    }

    setupFooterVisibility() {
        const footer = document.querySelector('.modern-footer-dock');
        if (!footer) return;

        window.addEventListener('scroll', () => {
            // Check if the user is at the bottom of the page (with 50px buffer)
            const scrollPosition = window.innerHeight + window.scrollY;
            const threshold = document.documentElement.scrollHeight - 50;

            if (scrollPosition >= threshold) {
                footer.classList.add('visible');
            } else {
                footer.classList.remove('visible');
            }
        });
    }

    // View/Delete handlers called from HTML
    deleteDocument(id) {
        if (confirm('Supprimer ce document ?')) {
            this.docs.deleteDocument(id);
            UIManager.showToast('Document supprimé');
        }
    }

    viewDocument(id) {
        alert('Voir document ' + id);
        // Implement preview modal
    }

    setupDocumentForms() {
        const btnAjouter = document.getElementById('ajouter-document');
        const containerType = document.getElementById('type-document-container');

        if (btnAjouter) {
            btnAjouter.addEventListener('click', () => {
                containerType.classList.toggle('hidden');
                document.getElementById('formulaire-document').classList.add('hidden');
            });
        }

        const typeSelect = document.getElementById('type-document');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.renderForm(e.target.value);
            });
        }
    }

    renderForm(type) {
        const container = document.getElementById('formulaire-document');
        if (!container) return;

        container.classList.remove('hidden');
        // Switch/Case to render specific forms
        // Leveraging the existing generator functions (assumed to be available or moved into a Helper class)
        container.innerHTML = FormHelpers.getFormHtml(type);

        // Re-initialize Lucide icons for new form content
        if (window.lucide) {
            lucide.createIcons();
        }

        // Bind submit
        const form = container.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleDocSubmit(e, type));
        }
    }

    async handleDocSubmit(e, type) {
        e.preventDefault();
        const fd = new FormData(e.target);

        // Handle file reading
        const docData = {};
        for (let [k, v] of fd.entries()) {
            if (v instanceof File && v.size > 0) {
                docData[k] = await this.fileToBase64(v);
            } else {
                docData[k] = v;
            }
        }

        const res = await this.docs.addDocument({ type, donnees: docData });
        if (res.success) {
            UIManager.showToast('Document ajouté');
            e.target.reset();
            UIManager.navigateTo('documents'); // Refresh view
            UIManager.renderDocuments(this.docs.documents);
        } else {
            UIManager.showToast(res.message || 'Erreur lors de l\'ajout du document', 'error');
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

/**
 * Form Helpers - Ported from original file
 */
const FormHelpers = {
    getFormHtml(type) {
        switch (type) {
            case 'cv': return this.cvForm();
            case 'document-administratif': return this.adminForm();
            case 'fiche-paie': return this.fichePaieForm();
            case 'liste-employes': return this.listeEmployesForm();
            case 'liste-etudiants': return this.listeEtudiantsForm();
            default: return '<p>Formulaire non disponible</p>';
        }
    },

    cvForm() {
        return `
        <div class="form-header">
            <i data-lucide="file-user"></i>
            <h3>Dépôt de Curriculum Vitae</h3>
        </div>
        <form id="form-cv">
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Titre du document interne</label>
                    <input type="text" name="documentName" placeholder="ex: CV_Developpeur_Senior_Mars_2025" required>
                </div>
                
                <p class="form-section-title">Informations Personnelles</p>
                <div class="form-group">
                    <label>Nom complet</label>
                    <input type="text" name="nomComplet" placeholder="Prénom et Nom" required>
                </div>
                <div class="form-group">
                    <label>Adresse Email</label>
                    <input type="email" name="email" placeholder="candidat@exemple.com" required>
                </div>
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="tel" name="telephone" placeholder="+221 ...">
                </div>
                <div class="form-group">
                    <label>Ville de résidence</label>
                    <input type="text" name="ville" placeholder="Dakar, Sénégal">
                </div>

                <p class="form-section-title">Parcours & Spécialisation</p>
                <div class="form-group">
                    <label>Poste recherché / Titre</label>
                    <input type="text" name="poste" placeholder="ex: Ingénieur DevOps" required>
                </div>
                <div class="form-group">
                    <label>Niveau d'expérience</label>
                    <select name="experience">
                        <option value="junior">Junior (0-2 ans)</option>
                        <option value="intermediaire">Intermédiaire (2-5 ans)</option>
                        <option value="senior">Senior (5-10 ans)</option>
                        <option value="expert">Expert (10+ ans)</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Compétences clés (séparées par des virgules)</label>
                    <input type="text" name="competences" placeholder="ex: JavaScript, Cloud, Docker, Management">
                </div>
                <div class="form-group full-width">
                    <label>Fichier du CV</label>
                    <input type="file" name="fichier" accept=".pdf,.doc,.docx" required>
                </div>
            </div>
            <button type="submit" class="btn-submit"><i data-lucide="upload-cloud"></i> Archiver le CV</button>
        </form>`;
    },

    adminForm() {
        return `
        <div class="form-header">
            <i data-lucide="clipboard-list"></i>
            <h3>Document Administratif</h3>
        </div>
        <form id="form-admin">
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Nom du document</label>
                    <input type="text" name="documentName" placeholder="Nom descriptif du document" required>
                </div>

                <p class="form-section-title">Classification</p>
                <div class="form-group">
                    <label>Type de document</label>
                    <select name="docType">
                        <option value="contrat">Contrat / Accord</option>
                        <option value="note">Note de Service</option>
                        <option value="rapport">Rapport d'Activité</option>
                        <option value="courrier">Courrier Officiel</option>
                        <option value="autre">Autre Document</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Numéro de Référence / Dossier</label>
                    <input type="text" name="reference" placeholder="REF-2025-001">
                </div>
                <div class="form-group">
                    <label>Date du document</label>
                    <input type="date" name="dateDocument" required>
                </div>
                <div class="form-group">
                    <label>Niveau de Confidentialité</label>
                    <select name="confidentialite">
                        <option value="public">Public</option>
                        <option value="interne">Usage Interne</option>
                        <option value="confidentiel">Confidentiel</option>
                        <option value="secret">Secret Défense / Critique</option>
                    </select>
                </div>

                <div class="form-group full-width">
                    <label>Description courte / Résumé du contenu</label>
                    <textarea name="description" rows="3" placeholder="Description sommaire du document administratif..."></textarea>
                </div>
                
                <div class="form-group full-width">
                    <label>Fichier</label>
                    <input type="file" name="fichier" required>
                </div>
            </div>
            <button type="submit" class="btn-submit"><i data-lucide="save"></i> Enregistrer le document</button>
        </form>`;
    },

    fichePaieForm() {
        return `
        <div class="form-header">
            <i data-lucide="wallet"></i>
            <h3>Fiche de Salaire / Bulletin de Paie</h3>
        </div>
        <form id="form-paie">
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Titre de l'archive</label>
                    <input type="text" name="documentName" placeholder="ex: Fiche_Paie_Janvier_2025_Medoune" required>
                </div>

                <p class="form-section-title">Détails Salarié</p>
                <div class="form-group">
                    <label>Nom du Salarié</label>
                    <input type="text" name="salarieNom" placeholder="Nom complet de l'employé" required>
                </div>
                <div class="form-group">
                    <label>Matricule</label>
                    <input type="text" name="matricule" placeholder="ID Employé (ex: EMP042)">
                </div>

                <p class="form-section-title">Période & Montant</p>
                <div class="form-group">
                    <label>Mois de référence</label>
                    <input type="month" name="mois" required>
                </div>
                <div class="form-group">
                    <label>Salaire Net à Payer (FCFA)</label>
                    <input type="number" name="salaireNet" placeholder="Montant en chiffres" required>
                </div>
                
                <div class="form-group full-width">
                    <label>Fichier Bulletin (PDF)</label>
                    <input type="file" name="fichier" accept=".pdf" required>
                </div>
            </div>
            <button type="submit" class="btn-submit"><i data-lucide="lock"></i> Archiver le bulletin</button>
        </form>`;
    },

    listeEmployesForm() {
        return `
        <div class="form-header">
            <i data-lucide="contact-2"></i>
            <h3>Registre des Employés</h3>
        </div>
        <form id="form-employes">
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Nom de la liste / Département</label>
                    <input type="text" name="documentName" placeholder="ex: Liste_Equipe_IT_2025" required>
                </div>

                <div class="form-group">
                    <label>Nombre total d'employés</label>
                    <input type="number" name="nombreEmployes" placeholder="ex: 12">
                </div>
                <div class="form-group">
                    <label>Statut du département</label>
                    <select name="statutDept">
                        <option value="actif">Opérationnel</option>
                        <option value="restructuration">En restructuration</option>
                        <option value="en_attente">En cours de constitution</option>
                    </select>
                </div>
                
                <div class="form-group full-width">
                    <label>Notes complémentaires</label>
                    <textarea name="notes" rows="2" placeholder="Informations supplémentaires sur cette liste..."></textarea>
                </div>
            </div>
            <button type="submit" class="btn-submit"><i data-lucide="plus-square"></i> Créer le registre</button>
        </form>`;
    },

    listeEtudiantsForm() {
        return `
        <div class="form-header">
            <i data-lucide="graduation-cap"></i>
            <h3>Liste Académique / Étudiants</h3>
        </div>
        <form id="form-etudiants">
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Nom de la Promotion / Classe</label>
                    <input type="text" name="documentName" placeholder="ex: Master_INFO_AS_2024_2025" required>
                </div>

                <div class="form-group">
                    <label>Année Universitaire</label>
                    <input type="text" name="annee" placeholder="ex: 2024-2025" required>
                </div>
                <div class="form-group">
                    <label>Spécialité / Filière</label>
                    <input type="text" name="filiere" placeholder="ex: Génie Logiciel" required>
                </div>
                
                <div class="form-group full-width">
                    <label>Fichier de la liste (Excel / CSV / PDF)</label>
                    <input type="file" name="fichier">
                </div>
            </div>
            <button type="submit" class="btn-submit"><i data-lucide="save"></i> Enregistrer la liste</button>
        </form>`;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});