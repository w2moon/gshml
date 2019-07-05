Object.defineProperty(exports, "__esModule", { value: true });
const noop = () => { };
function synchronizedStatic(func) {
    let previousResult = undefined;
    return (function (...args) {
        const result = !previousResult
            ? new Promise(resolve => resolve(func.apply(this, args)))
            : previousResult.catch(noop).then(() => func.apply(this, args));
        previousResult = result;
        result.finally(() => {
            if (previousResult === result) {
                previousResult = undefined;
            }
        });
        return result;
    });
}
function synchronizedMethod(method) {
    const previousResults = new WeakMap();
    return (function (...args) {
        const previousResult = previousResults.get(this);
        const result = !previousResult
            ? new Promise(resolve => resolve(method.apply(this, args)))
            : previousResult.catch(noop).then(() => method.apply(this, args));
        previousResults.set(this, result);
        result.finally(() => {
            if (previousResults.get(this) === result) {
                previousResults.delete(this);
            }
        });
        return result;
    });
}
exports.synchronized = (function (target, name, descriptor) {
    if (name === undefined) {
        return synchronizedStatic(target);
    }
    else {
        return Object.assign({}, descriptor, { value: synchronizedMethod(descriptor.value) });
    }
});
