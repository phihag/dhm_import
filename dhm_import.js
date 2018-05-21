'use strict';

function add_files(ev) {
	const files = ev.target.files;
	for (const f of files) {
		const reader = new FileReader();
		reader.onload = (function(f_scoped) {
			return (ev) => {
				const content = ev.target.result;
				add_file(content, f_scoped.name);
			};
		})(f);
		reader.readAsArrayBuffer(f);
	}
}

function add_file(ab, name) {
	const f = XLSX.read(ab, {
		type: 'buffer',
	});
	const sheet = f.Sheets[f.SheetNames[0]];
	const headers = [];
	const range = XLSX.utils.decode_range(sheet['!ref']);
	for (let col = 0;col < range.e.c;col++) {
		const v = sheet[XLSX.utils.encode_cell({c: col, r: 0})].v;
		if (!v) {
			break;
		}
		headers.push(v);
	}
}


document.addEventListener('DOMContentLoaded', () => {
	uiu.qs('#input').addEventListener('change', add_files);
});
