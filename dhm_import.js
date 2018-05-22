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

function read_excel(sheet) {
	const headers = [];
	const range = XLSX.utils.decode_range(sheet['!ref']);
	for (let col = 0;col < range.e.c;col++) {
		const v = sheet[XLSX.utils.encode_cell({c: col, r: 0})].v;
		if (!v) {
			break;
		}
		headers.push(v);
	}

	const res = [];
	for (let r = 1;r < range.e.r;r++) {
		const v0 = sheet[XLSX.utils.encode_cell({c: 0, r})].v;
		if (!v0) {
			break;
		}
		
		const row = {};
		for (let c = 0;c < headers.length;c++) {
			const cell = sheet[XLSX.utils.encode_cell({c, r})];
			if (!cell) {
				continue;
			}
			row[headers[c]] = cell.v;
		}
		res.push(row);
	}

	return res;
}

// Amend the Map res of all unique players in the input.
// Key is the internal id, value is an object with the keys:
// - lastname
// - firstname
// - sex ("m" or "f")
// - clubname (this will be the university name)
// - textid (the official ID of the player if contained in the input)
// - league (name of the league the player is playing in, e.g. "2. Bundesliga")
// - email (the player's email, if provided)
// - internalid (first and last name - we use this to identify the player)
// - entries: An array of disciplines the player is playing in. Each element is an object with the keys:
//   - discipline: Name of the discipline (one of "HE", "DE", "HD", "DD", or "MX")
//   - partner_internalid: Set in doubles disciplines only.
function extract_players(res, sdata, warnfunc) {
	function _add_player(p, entry) {
		const player = res.get(p.internalid);
		if (player) {
			if (!player.entries.some((e) => e.discipline === entry.discipline)) {
				player.entries.push(entry);
			}
		} else {
			// Add a new player
			p.entries = [entry];
			res.set(p.internalid, p);
		}
	}

	for (const row of sdata) {
		if (row.Vorname && row.Nachname) {
			// Singles
			const internalid = row.Vorname.trim() + row.Nachname.trim();
			let sex = {
				'männlich': 'm',
				'weiblich': 'f',
			}[row.Sex];
			if (!sex) {
				warnfunc('Skipping row ' + JSON.stringify(row) + ': Cannot determine sex');
				continue;
			}

			_add_player({
				firstname: row.Vorname.trim(),
				lastname: row.Nachname.trim(),
				sex,
				clubname: row.UniName,
				league: row.Spielklasse,
				email: row.Mail,
				internalid,
			}, {
				discipline: (sex === 'm') ? 'HE' : 'DE',
			});
		} else if (row.S1Nachname) { // Some kind of doubles
			const discipline = {
				'Damen-Doppel': 'DD',
				'Mixed': 'MX',
				'Herren-Doppel': 'HD',
			}[row.Wettkampf];
			if (!discipline) {
				warnfunc('Skipping row ' + JSON.stringify(row) + ': Cannot determine parse discipline');
				continue;
			}

			const p1_internalid = row.S1Vorname.trim() + row.S1Nachname.trim();
			let p1_sex = {
				'männlich': 'm',
				'weiblich': 'f',
			}[row.S1Sex];
			if (!p1_sex) {
				warnfunc('Skipping row ' + JSON.stringify(row) + ': Cannot determine sex of first player');
				continue;
			}

			const p1 = {
				firstname: row.S1Vorname.trim(),
				lastname: row.S1Nachname.trim(),
				p1_sex,
				clubname: row.S1Hochschule,
				league: row.S1Spielklasse,
				internalid: p1_internalid,
			};

			const free_entry = (
				!row.S2Nachname ||
				!row.S2Vorname ||
				(row.S2Nachname.toLowerCase().trim() === 'frei') ||
				(row.S2Vorname.toLowerCase().trim() === 'frei')
			);
			if (free_entry) {
				_add_player(p1, {
					discipline,
				});
				continue;
			}

			const p2_internalid = row.S2Vorname.trim() + row.S2Nachname.trim();
			let p2_sex = {
				'männlich': 'm',
				'weiblich': 'f',
			}[row.S2Sex];
			if (!p2_sex) {
				warnfunc('Skipping row ' + JSON.stringify(row) + ': Cannot determine sex of second player');
				continue;
			}
			const p2 = {
				firstname: row.S2Vorname.trim(),
				lastname: row.S2Nachname.trim(),
				p2_sex,
				clubname: row.S2Hochschule,
				league: row.S2Spielklasse,
				internalid: p2_internalid,
			};

			_add_player(p1, {
				discipline,
				partner: p2_internalid,
			});
			_add_player(p2, {
				discipline,
				partner: p1_internalid,
			});
		} else {
			warnfunc('Skipping row ' + JSON.stringify(row) + ': Cannot determine whether singles or doubles');
		}
	}
}

// Every file is an object with the keys:
// - content (content of the file as ArrayBuffer)
// - name (file name)
function interpret_files(files) {
	const players = new Map();
	for (const f of files) {
		const workbook = XLSX.read(f.content, {
			type: 'buffer',
		});
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const sdata = read_excel(sheet);
		extract_players(players, sdata, console.error);
	}

	console.log(players);
}


document.addEventListener('DOMContentLoaded', () => {
	uiu.qs('#input').addEventListener('change', add_files);
});
