const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 8080;

// Variabilă globală pentru obiecte
const obGlobal = {
    obErori: null
};

// Funcție pentru inițializarea erorilor
function initErori() {
    try {
        // Citim fișierul JSON cu erori
        const eroriPath = path.join(__dirname, 'resurse', 'json', 'erori.json');
        const eroriData = JSON.parse(fs.readFileSync(eroriPath, 'utf8'));

        // Setăm calea absolută pentru imaginea erorii default
        eroriData.eroare_default.imagine = path.join(eroriData.cale_baza, eroriData.eroare_default.imagine);

        // Setăm calea absolută pentru imaginile din info_erori
        eroriData.info_erori.forEach(eroare => {
            eroare.imagine = path.join(eroriData.cale_baza, eroare.imagine);
        });

        // Salvăm obiectul în variabila globală
        obGlobal.obErori = eroriData;
        console.log('Erorile au fost încărcate cu succes');
    } catch (err) {
        console.error('Eroare la încărcarea erorilor:', err);
        process.exit(1); // Oprim aplicația dacă nu putem încărca erorile
    }
}

// Funcție pentru afișarea erorilor
function afisareEroare(res, identificator = null, titlu = null, text = null, imagine = null) {
    let dateEroare = {};

    if (identificator) {
        // Căutăm eroarea cu identificatorul specificat
        const eroareGasita = obGlobal.obErori.info_erori.find(e => e.identificator === identificator);
        if (eroareGasita) {
            dateEroare = { ...eroareGasita };
        } else {
            // Dacă nu găsim eroarea, folosim eroarea default
            dateEroare = { ...obGlobal.obErori.eroare_default };
        }
    } else {
        // Dacă nu avem identificator, folosim eroarea default
        dateEroare = { ...obGlobal.obErori.eroare_default };
    }

    // Suprapunem datele din argumente peste datele din JSON
    if (titlu) dateEroare.titlu = titlu;
    if (text) dateEroare.text = text;
    if (imagine) dateEroare.imagine = imagine;

    // Setăm status code-ul dacă este specificat în datele erorii
    if (dateEroare.status) {
        res.status(dateEroare.identificator || 500);
    }

    // Randăm pagina de eroare cu datele finalizate
    res.render('pagini/eroare', dateEroare);
}

// Inițializăm erorile la pornirea aplicației
initErori();

// Afișăm informații despre căi
console.log('__dirname:', __dirname);
console.log('__filename:', __filename);
console.log('process.cwd():', process.cwd());

// Setăm EJS ca template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pentru a procesa JSON și form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servim fișierele statice din directorul resurse
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// Funcție helper pentru a verifica dacă un template există
function templateExists(templatePath) {
    const fullPath = path.join(__dirname, 'views', templatePath + '.ejs');
    return fs.existsSync(fullPath);
}

// Ruta de bază - accesibilă prin multiple căi
app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', (err, html) => {
        if (err) {
            if (err.message.startsWith('Failed to lookup view')) {
                console.log('404 - Pagina nu a fost găsită');
                afisareEroare(res, 404);
            } else {
                console.error('Eroare la randarea paginii:', err);
                afisareEroare(res);
            }
        } else {
            res.send(html);
        }
    });
});

// Ruta pentru formularul de contact
app.post('/contact', (req, res) => {
    // Aici vom procesa datele formularului
    console.log('Date primite:', req.body);
    // Pentru moment, doar redirecționăm înapoi la pagina de contact
    res.redirect('/contact');
});

// Ruta generală pentru toate celelalte pagini
app.get('/:page', (req, res) => {
    const pageName = req.params.page;
    const templatePath = `pagini/${pageName}`;

    if (templateExists(templatePath)) {
        // Dacă template-ul există, îl randăm
        res.render(templatePath, (err, html) => {
            if (err) {
                if (err.message.startsWith('Failed to lookup view')) {
                    console.log('404 - Pagina nu a fost găsită:', templatePath);
                    afisareEroare(res, 404);
                } else {
                    console.error('Eroare la randarea paginii:', err);
                    afisareEroare(res);
                }
            } else {
                res.send(html);
            }
        });
    } else {
        // Dacă template-ul nu există, afișăm pagina 404
        console.log('404 - Pagina nu a fost găsită:', templatePath);
        afisareEroare(res, 404);
    }
});

// Pornim serverul
app.listen(port, () => {
    console.log(`Serverul rulează pe portul ${port}`);
}); 