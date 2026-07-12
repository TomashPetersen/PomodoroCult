export interface SerializedOperationQueue {
  enqueue<T>(operation: () => Promise<T>): Promise<T>;
}

export const createSerializedOperationQueue = (): SerializedOperationQueue => {
  let tail: Promise<void> = Promise.resolve();

  return {
    enqueue<T>(operation: () => Promise<T>): Promise<T> {
      const result = tail.then(operation, operation);
      tail = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    }
  };
};
