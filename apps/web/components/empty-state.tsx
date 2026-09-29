export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        <span />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
