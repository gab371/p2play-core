/** Move a flat Record entry from oldId → newId (no-op if absent). */
export function remapRecordKey<T>(
  record: Record<string, T>,
  oldId: string,
  newId: string,
): void {
  if (oldId === newId) return;
  if (!Object.prototype.hasOwnProperty.call(record, oldId)) return;
  record[newId] = record[oldId];
  delete record[oldId];
}
