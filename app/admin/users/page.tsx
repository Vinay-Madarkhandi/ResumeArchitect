import Link from "next/link";
import { DataTable, EmptyRow, PageTitle, Pager, dateTime } from "@/components/admin/parts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/authorization";
import { filter, listUsers, pageNumber } from "@/lib/admin/queries";

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const params = await searchParams;
  const email = filter(params, "email");
  const page = pageNumber(params);
  const { rows, hasNext } = await listUsers(email, page);

  return (
    <>
      <PageTitle title="Users" />
      <form action="/admin/users" className="mb-4 flex max-w-lg items-end gap-2">
        <div className="flex-1">
          <Field label="Search by email">{(props) => <Input {...props} type="search" name="email" defaultValue={email} maxLength={254} />}</Field>
        </div>
        <Button type="submit" variant="primary">Search</Button>
      </form>
      <DataTable title="Users" headers={["Email", "Role", "Status", "Joined (UTC)", "Last sign-in (UTC)"]}>
        {rows.length === 0 && <EmptyRow columns={5}>No matching accounts.</EmptyRow>}
        {rows.map((user) => (
          <tr key={user.id}>
            <td>
              <Link className="font-medium underline decoration-line-strong underline-offset-4 hover:text-brass" href={`/admin/users/${user.id}`}>
                {user.email}
              </Link>
            </td>
            <td><Badge>{user.role === "admin" ? "Admin" : "User"}</Badge></td>
            <td>{user.banned_at ? <Badge tone="del">Suspended</Badge> : user.email_verified_at ? <Badge tone="add">Verified</Badge> : <Badge tone="query">Unverified</Badge>}</td>
            <td className="whitespace-nowrap">{dateTime(user.created_at)}</td>
            <td className="whitespace-nowrap">{dateTime(user.last_sign_in_at)}</td>
          </tr>
        ))}
      </DataTable>
      <Pager path="/admin/users" page={page} hasNext={hasNext} filters={{ email }} />
    </>
  );
}
