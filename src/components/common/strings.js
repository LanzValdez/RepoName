export function toTitleCase(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(/[\s_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export const sortBy = (arr, keyOrSelector, opts = {}) => {
    const {
        order = 'asc',
        locale,
        sensitivity = 'base',        // case-insensitive
        ignorePunctuation = true,
        numeric = true,               // "2" < "10"
        undefinedLast = true,         // place missing values at the end
        tieBreaker,                   // optional: string path or selector fn
    } = opts;

    if (!Array.isArray(arr)) return [];
    if (arr.length < 2) return arr.slice();

    const collator = new Intl.Collator(locale, { sensitivity, ignorePunctuation, numeric });
    const dir = order === 'desc' ? -1 : 1;
    const toStr = v => (v == null ? '' : String(v).trim());

    const getFromPath = (obj, path) => {
        if (!obj || typeof path !== 'string') return undefined;
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
        let out = obj;
        for (const p of parts) {
            if (out == null) return undefined;
            out = out[p];
        }
        return out;
    };

    const makeGetter = (p) => {
        if (typeof p === 'function') return p;
        if (typeof p === 'string' && p.trim() !== '') return (o) => getFromPath(o, p);
        return undefined; // invalid/empty key
    };

    const get = makeGetter(keyOrSelector);
    const getTie = makeGetter(tieBreaker);

    if (!get) {
        const allPrimitive = arr.every(v => v == null || (typeof v !== 'object' && typeof v !== 'function'));
        if (allPrimitive) {
            return [...arr].sort((a, b) => dir * collator.compare(toStr(a), toStr(b)));
        }
        return arr.slice();
    }

    const cmpCore = (aVal, bVal) => {
        const aU = aVal == null;
        const bU = bVal == null;
        if (aU || bU) {
            if (aU && bU) return 0;
            // undefinedLast => undefined > defined
            return (aU ? 1 : -1) * (undefinedLast ? 1 : -1);
        }
        const ta = typeof aVal;
        const tb = typeof bVal;
        if (ta === 'number' && tb === 'number') return aVal - bVal;
        if (ta === 'boolean' && tb === 'boolean') return aVal === bVal ? 0 : (aVal ? 1 : -1);
        return collator.compare(toStr(aVal), toStr(bVal));
    };

    return [...arr].sort((a, b) => {
        const primary = dir * cmpCore(get(a), get(b));
        if (primary !== 0) return primary;
        if (getTie) return dir * cmpCore(getTie(a), getTie(b));
        return 0; // stable tie
    });
}

export const isEmptyObject = (obj) =>
    obj == null || (Object.prototype.toString.call(obj) === '[object Object]' && Object.keys(obj).length === 0);

export const hasObjectData = (obj) => !!obj && Object.prototype.toString.call(obj) === '[object Object]' && Object.keys(obj).length > 0;