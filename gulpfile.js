const path = require('path');
const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);
task('build:python', copyPython);

function copyPython() {
	// Copia script python impacket wrapper dentro dist per la pubblicazione
	const pythonSource = path.resolve('python', '**', '*.py');
	const pythonDest = path.resolve('dist', 'python');
	return src(pythonSource).pipe(dest(pythonDest));
}

function copyIcons() {
	// Copia solo le icone realmente necessarie per il pacchetto (esclude esempi)
	const wmiIconSource = path.resolve('nodes', 'Wmi', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes', 'Wmi');

	src(wmiIconSource).pipe(dest(nodeDestination));

	// (Attualmente nessuna icona per credenziali, mantenere funzione estensibile senza includere esempi)
	return Promise.resolve();
}
