
const noop = () => {};

function synchronizedStatic(func: Function) {
    let previousResult = undefined;
    return (function(this: any, ...args: any[]) {
        const result: any = !previousResult
            ? new Promise(resolve => resolve(func.apply( this , args)))
            : previousResult.catch(noop).then(() => func.apply(this, args));
        previousResult = result;
        result.finally(() => {
            if (previousResult === result) {
                previousResult = undefined;
            }
        });
        return result;
    }) as any;
}

function synchronizedMethod(method: any) {
    const previousResults = new WeakMap();
    return (function(this: any, ...args: any[]) {
        const previousResult = previousResults.get(this);
        const result: any = !previousResult
            ? new Promise(resolve => resolve(method.apply(this, args)))
            : previousResult.catch(noop).then(() => method.apply(this, args));
        previousResults.set(this, result);
        result.finally(() => {
            if (previousResults.get(this) === result) {
                previousResults.delete(this);
            }
        });
        return result;
    } ) as any;
}

// 使对异步方法的调用按顺序执行
// 同java中的synchronized
export const synchronized = (function(target: any, name?: string, descriptor?: PropertyDescriptor) {
     if (name === undefined) {
         return synchronizedStatic(target );
     } else {
        return {
            ...descriptor,
            value: synchronizedMethod(descriptor.value) ,
        } ;
     }
});