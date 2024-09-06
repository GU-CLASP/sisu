export function objectsEqual(obj1, obj2) {
    if (obj1 === obj2) {
        return true; // same reference or both are null/undefined
    }

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
        if (typeof obj1 === 'function' && typeof obj2 === 'function') {
            return obj1.toString() === obj2.toString(); // compare functions by their string representation
        }
        return false; // primitive values or one of them is null
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false; // different number of properties
    }

    for (let key of keys1) {
        if (!keys2.includes(key) || !objectsEqual(obj1[key], obj2[key])) {
            return false; // different properties or values
        }
    }

    return true;
}
