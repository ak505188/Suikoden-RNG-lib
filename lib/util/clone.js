/**
 * Per class, its copier: built from the first instance cloned, whose own property names every
 * instance of that class is expected to share (see shallowCloneInstance). `calls` counts copies,
 * for the sampled property check.
 * @type {Map<Function, { keys: string[], copy: (obj: object) => object, calls: number }>}
 */
const copiers = new Map();

/** Every this-many copies of a class, shallowCloneInstance checks the object's property names. */
const CLONE_CHECK_EVERY = 1024;

/**
 * A copier for objects of `constructor` with exactly `keys`: a function with one assignment per
 * property, which V8 runs about 8x faster than Object.assign's generic copy. Falls back to
 * Object.assign where code can't be generated (a browser with a strict CSP).
 * @param {Function} constructor
 * @param {string[]} keys
 * @returns {(obj: object) => object}
 */
function makeCopier(constructor, keys) {
  try {
    const body = keys.map((k) => `c[${JSON.stringify(k)}] = o[${JSON.stringify(k)}];`).join('\n');
    const copy = new Function(
      'P',
      `return o => {\nconst c = Object.create(P);\n${body}\nreturn c;\n};`,
    )(constructor.prototype);
    return /** @type {(obj: object) => object} */ (copy);
  } catch {
    return (obj) => Object.assign(Reflect.construct(Object, [], constructor), obj);
  }
}

/**
 * A shallow copy of `obj` (its own enumerable properties) with the same prototype, for clone()
 * methods. The copy starts from Object.create(proto), without running obj's constructor, and the
 * generated copier adds the properties one by one in a fixed order, so every copy of a class
 * shares one hidden class. (Object.assign onto Object.create(proto) instead leaves an object with
 * that many properties in slow dictionary mode, making every property read in the battle loop a
 * hash lookup, ~3x slower.) Not Reflect.construct(Object, [], C): it costs 65-90ns a call (vs
 * ~8ns), and it keeps resizing C's constructor-built instances, so every battle built after a
 * search has new hidden classes and the battle code slows down a little more with each one (a
 * script running 6 searches in one process took 1.4s, then 2.2s each; with Object.create, 1.1s).
 * The properties are copied by a generated copier, one per class, built from the first instance
 * cloned. So every instance of a class must have the same own properties: set them all
 * (unconditionally) in the constructor, and never add one later, or the copier won't know it.
 * Checking every object's property names costs ~15% of a brute-force search, so it's sampled:
 * every CLONE_CHECK_EVERY-th copy of a class (the first included), which throws on a mismatch.
 * @template {object} T
 * @param {T} obj
 * @returns {T}
 */
export function shallowCloneInstance(obj) {
  let entry = copiers.get(obj.constructor);
  if (!entry) {
    const keys = Object.keys(obj);
    copiers.set(
      obj.constructor,
      (entry = { keys, copy: makeCopier(obj.constructor, keys), calls: 0 }),
    );
  }
  if (entry.calls++ % CLONE_CHECK_EVERY === 0) checkProperties(obj, entry.keys);
  return /** @type {T} */ (entry.copy(obj));
}

/**
 * Throws unless `obj` has exactly the own properties `keys` (in any order).
 * @param {object} obj @param {string[]} keys
 */
function checkProperties(obj, keys) {
  const own = Object.keys(obj);
  if (own.length === keys.length && own.every((k) => keys.includes(k))) return;
  const extra = own.filter((k) => !keys.includes(k)),
    missing = keys.filter((k) => !own.includes(k));
  throw new Error(
    `shallowCloneInstance: this ${obj.constructor.name} has different properties from the first one ` +
      `cloned (extra: ${extra.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}). Set every property ` +
      'in the constructor, unconditionally.',
  );
}
