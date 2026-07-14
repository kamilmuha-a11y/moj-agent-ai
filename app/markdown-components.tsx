type WithNode<T> = T & { node?: unknown };

export const markdownComponents = {
  table: ({ node: _node, ...props }: WithNode<React.ComponentProps<"table">>) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }: WithNode<React.ComponentProps<"thead">>) => (
    <thead className="bg-[var(--panel-bg)]" {...props} />
  ),
  th: ({ node: _node, ...props }: WithNode<React.ComponentProps<"th">>) => (
    <th
      className="border border-[var(--border)] px-3 py-2 text-left font-semibold"
      {...props}
    />
  ),
  td: ({ node: _node, ...props }: WithNode<React.ComponentProps<"td">>) => (
    <td className="border border-[var(--border)] px-3 py-2 align-top" {...props} />
  ),
  h1: ({ node: _node, ...props }: WithNode<React.ComponentProps<"h1">>) => (
    <h1 className="mb-2 mt-3 text-lg font-semibold" {...props} />
  ),
  h2: ({ node: _node, ...props }: WithNode<React.ComponentProps<"h2">>) => (
    <h2 className="mb-2 mt-3 text-base font-semibold" {...props} />
  ),
  h3: ({ node: _node, ...props }: WithNode<React.ComponentProps<"h3">>) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold" {...props} />
  ),
  ul: ({ node: _node, ...props }: WithNode<React.ComponentProps<"ul">>) => (
    <ul className="my-2 list-disc space-y-1 pl-5" {...props} />
  ),
  ol: ({ node: _node, ...props }: WithNode<React.ComponentProps<"ol">>) => (
    <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />
  ),
  p: ({ node: _node, ...props }: WithNode<React.ComponentProps<"p">>) => (
    <p className="mb-2 last:mb-0" {...props} />
  ),
  strong: ({ node: _node, ...props }: WithNode<React.ComponentProps<"strong">>) => (
    <strong className="font-semibold text-[var(--foreground)]" {...props} />
  ),
  code: ({ node: _node, ...props }: WithNode<React.ComponentProps<"code">>) => (
    <code className="rounded bg-[var(--panel-bg)] px-1 py-0.5 text-xs" {...props} />
  ),
};
