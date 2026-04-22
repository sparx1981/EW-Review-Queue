/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-md ${className}`} />
  );
}
