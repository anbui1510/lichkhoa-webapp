import * as React from 'react';
import { cn } from '@/lib/utils';

function Alert({ className, ...props }) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground',
        className
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }) {
  return <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />;
}

function AlertDescription({ className, ...props }) {
  return <div className={cn('text-sm text-muted-foreground [&_p]:leading-relaxed', className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
