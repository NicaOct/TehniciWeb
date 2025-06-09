// 2. importa si configureaza serverul express
const express = require('express');
const path = require('path');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const app = express();
const port = 8080; // 2. portul pe care asculta serverul

// 3. afiseaza caile relevante la pornirea serverului
console.log('__dirname:', __dirname); // 3
console.log('__filename:', __filename); // 3
console.log('process.cwd():', process.cwd()); // 3

// 13. vector cu numele folderelor de creat
const vect_foldere = ["temp"];

// 12. creare foldere daca nu exista
vect_foldere.forEach(fld => {
    const caleFolder = path.join(__dirname, fld);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
        console.log(`am creat folderul: ${caleFolder}`);
    }
});

// 15. ruta pentru favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse', 'favicon.ico'));
});

// 11. middleware pentru a bloca accesul direct la fisiere .ejs si a returna 400 bad request
app.use((req, res, next) => {
    if (/\.ejs($|\?)/.test(req.url)) {
        return afisareEroare(res, 400);
    }
    next();
});

// 9. middleware pentru a bloca accesul la directoare din /resurse fara fisier specificat
app.use('/resurse', (req, res, next) => {
    const requestedPath = path.join(__dirname, 'resurse', req.path);
    try {
        if (fs.existsSync(requestedPath) && fs.lstatSync(requestedPath).isDirectory()) {
            // daca se acceseaza un director, returnam 403 forbidden cu pagina personalizata
            return afisareEroare(res, 403);
        }
    } catch (e) {
        // daca apare o eroare la verificare, continuam cu urmatorul middleware
    }
    next();
});

// 6. servim fisierele statice din directorul resurse
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// 7. functie helper pentru a verifica daca un template exista
function templateExists(templatePath) {
    const fullPath = path.join(__dirname, 'views', templatePath + '.ejs');
    return fs.existsSync(fullPath);
}

// 13. variabila globala pentru obiecte
const obGlobal = {
    obErori: null
};

// 13. functie pentru initializarea erorilor
function initErori() {
    try {
        // 13. citim fisierul json cu erori
        const eroriPath = path.join(__dirname, 'resurse', 'json', 'erori.json');
        const eroriData = JSON.parse(fs.readFileSync(eroriPath, 'utf8'));

        // 13. setam calea absoluta pentru imaginea erorii default
        eroriData.eroare_default.imagine = path.join(eroriData.cale_baza, eroriData.eroare_default.imagine);

        // 13. setam calea absoluta pentru imaginile din info_erori
        eroriData.info_erori.forEach(eroare => {
            eroare.imagine = path.join(eroriData.cale_baza, eroare.imagine);
        });

        // 13. salvam obiectul in variabila globala
        obGlobal.obErori = eroriData;
        console.log('erorile au fost incarcate cu succes');
    } catch (err) {
        console.error('eroare la incarcarea erorilor:', err);
        process.exit(1); // oprim aplicatia daca nu putem incarca erorile
    }
}

// 14. functie pentru afisarea erorilor
function afisareEroare(res, identificator = null, titlu = null, text = null, imagine = null) {
    let dateEroare = {};

    if (identificator) {
        // 14. cautam eroarea cu identificatorul specificat
        const eroareGasita = obGlobal.obErori.info_erori.find(e => e.identificator === identificator);
        if (eroareGasita) {
            dateEroare = { ...eroareGasita };
        } else {
            // 14. daca nu gasim eroarea, folosim eroarea default
            dateEroare = { ...obGlobal.obErori.eroare_default };
        }
    } else {
        // 14. daca nu avem identificator, folosim eroarea default
        dateEroare = { ...obGlobal.obErori.eroare_default };
    }

    // 14. suprapunem datele din argumente peste datele din json
    if (titlu) dateEroare.titlu = titlu;
    if (text) dateEroare.text = text;
    if (imagine) dateEroare.imagine = imagine;

    // 14. setam status code-ul daca este specificat in datele erorii
    if (dateEroare.status) {
        res.status(dateEroare.identificator || 500);
    }

    // 14. randam pagina de eroare cu datele finalizate
    res.render('pagini/eroare', dateEroare);
}

// 13. initializam erorile la pornirea aplicatiei
initErori();

// 5. setam ejs ca template engine si views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 5. configuram express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'fragmente/layout');
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);

// 1. middleware pentru a procesa json si form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. middleware pentru a obtine ip-ul utilizatorului
app.use((req, res, next) => {
    // obtinem ip-ul din header-ul x-forwarded-for sau din conexiune
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // adaugam ip-ul in res.locals pentru a fi disponibil in toate view-urile
    res.locals.userIP = ip;
    next();
});

// 6. ruta de baza - accesibila prin multiple cai
app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', (err, html) => {
        if (err) {
            if (err.message.startsWith('Failed to lookup view')) {
                console.log('404 - pagina nu a fost gasita');
                afisareEroare(res, 404);
            } else {
                console.error('eroare la randarea paginii:', err);
                afisareEroare(res);
            }
        } else {
            res.send(html);
        }
    });
});

// 6. ruta generala pentru toate celelalte pagini
app.get('/:page', (req, res) => {
    const pageName = req.params.page;
    const templatePath = `pagini/${pageName}`;

    if (templateExists(templatePath)) {
        // daca template-ul exista, il randam
        res.render(templatePath, (err, html) => {
            if (err) {
                if (err.message.startsWith('Failed to lookup view')) {
                    console.log('404 - pagina nu a fost gasita:', templatePath);
                    afisareEroare(res, 404);
                } else {
                    console.error('eroare la randarea paginii:', err);
                    afisareEroare(res);
                }
            } else {
                res.send(html);
            }
        });
    } else {
        // daca template-ul nu exista, afisam pagina 404
        console.log('404 - pagina nu a fost gasita:', templatePath);
        afisareEroare(res, 404);
    }
});

// 15. pornim serverul
app.listen(port, () => {
    console.log(`serverul ruleaza pe portul ${port}`);
}); 