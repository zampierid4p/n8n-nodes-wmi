const path = require('path');
const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);

function copyIcons() {
	// Copia solo le icone realmente necessarie per il pacchetto (esclude esempi)
	const wmiIconSource = path.resolve('nodes', 'Wmi', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes', 'Wmi');

	src(wmiIconSource).pipe(dest(nodeDestination));

	// (Attualmente nessuna icona per credenziali, mantenere funzione estensibile senza includere esempi)
	return Promise.resolve();
}
