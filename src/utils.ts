export function objectsEqual(obj1, obj2) {
    if (obj1 === obj2) {
        return true; // same reference or both are null/undefined
    }

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
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

export function WHQ(predicate) {
  return {
    type: "whq",
    predicate: predicate,
  }
}

export function findout(q) {
  return {
    type: "findout",
    content: q,
  }
}

export function consultDB(q) {
  return {
    type: "consultDB",
    content: q,
  }
}