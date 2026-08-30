### Task Updates — Optimistic Concurrency Control

Every task has a non-null `updated_at` timestamp that acts as its current version.

When the frontend updates, changes status, or deletes a task:

1. Use the task's `updated_at` value from the latest task data.
2. Send it as `expectedUpdatedAt` in the API request.
3. Do **not** generate a new timestamp on the frontend.
4. The backend checks that `expectedUpdatedAt` still matches the database value.
5. If another user changed the task first, the API returns **409 Conflict**.
6. On 409, refresh/re-fetch the task and show the user that the task was changed by someone else.
7. Do not blindly retry the same stale update.

Examples:

```ts
// Normal task update
{
  title: newTitle,
  expectedUpdatedAt: task.updated_at
}

// Status update
{
  status: "in_progress",
  expectedUpdatedAt: task.updated_at
}

// Delete
{
  expectedUpdatedAt: task.updated_at
}
```

After a successful update, replace the local task with the returned task because it contains the new `updated_at` version.

The frontend should treat the server response as the newest authoritative version.
