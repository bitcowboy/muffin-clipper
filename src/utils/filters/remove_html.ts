import { debugLog } from '../debug';

export const remove_html = (html: string, params: string = ''): string => {
	debugLog('RemoveHTML', 'Input:', { html, params });

	// Remove outer parentheses if present
	params = params.replace(/^\((.*)\)$/, '$1');

	// Remove any surrounding quotes (both single and double) and unescape internal quotes
	params = params.replace(/^(['"])(.*)\1$/, '$2').replace(/\\(['"])/g, '$1');

	// Check for exact match mode flag (backward compatible: default is prefix match)
	let matchMode: 'prefix' | 'exact' = 'prefix';
	let selectorsString = params;
	
	// Check for :exact suffix
	const exactMatchRegex = /:exact$/i;
	if (exactMatchRegex.test(params)) {
		matchMode = 'exact';
		selectorsString = params.replace(exactMatchRegex, '').trim();
	}

	// Split by comma, but respect both single and double quoted strings
	const elementsToRemove = selectorsString.split(/,(?=(?:(?:[^"']*["'][^"']*["'])*[^"']*$))/)
		.map(elem => elem.trim())
		.filter(Boolean);

	debugLog('RemoveHTML', 'Elements to remove:', elementsToRemove, 'Match mode:', matchMode);

	// If no elements specified, return the original HTML
	if (elementsToRemove.length === 0) {
		return html;
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	elementsToRemove.forEach(elem => {
		let elements: NodeListOf<Element> | HTMLCollectionOf<Element>;
		if (elem.startsWith('.')) {
			// Class selector - use match mode
			const className = elem.slice(1);
			if (matchMode === 'exact') {
				// Exact match: match complete word in space-separated class list
				elements = doc.querySelectorAll(`[class~="${className}"]`);
			} else {
				// Prefix match: match substring (backward compatible default)
				elements = doc.querySelectorAll(`[class*="${className}"]`);
			}
		} else if (elem.startsWith('#')) {
			// ID selector - always exact match
			elements = doc.querySelectorAll(`[id="${elem.slice(1)}"]`);
		} else {
			// Tag selector
			elements = doc.getElementsByTagName(elem);
		}

		// Convert HTMLCollection to Array if necessary
		Array.from(elements).forEach(el => el.parentNode?.removeChild(el));
	});

	// Serialize back to HTML
	const serializer = new XMLSerializer();
	let result = '';
	Array.from(doc.body.childNodes).forEach(node => {
		if (node.nodeType === Node.ELEMENT_NODE) {
			result += serializer.serializeToString(node);
		} else if (node.nodeType === Node.TEXT_NODE) {
			result += node.textContent;
		}
	});
	debugLog('RemoveHTML', 'Output:', result);

	return result;
};