import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migration enforces ownership, admin permissions, immutable identities and audit history", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      grant usage on schema auth to authenticated;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
      grant execute on function auth.uid(), auth.jwt() to authenticated;
    `);
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    const alice = "00000000-0000-4000-8000-000000000001";
    const bob = "00000000-0000-4000-8000-000000000002";
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3),($4,$5,$6)",
      [
        alice,
        "alice@example.com",
        JSON.stringify({ full_name: "Alice Silva", role: "admin" }),
        bob,
        "bob@example.com",
        JSON.stringify({ full_name: "Bob Souza" }),
      ],
    );
    await db.exec(`set role authenticated;`);
    async function identity(id, admin = false) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.query("select set_config('request.jwt.claims',$1,false)", [
        JSON.stringify({
          sub: id,
          app_metadata: admin ? { role: "admin" } : {},
          user_metadata: { role: "admin" },
        }),
      ]);
    }
    await identity(alice);
    assert.equal(
      (await db.query("select * from public.sr_profiles")).rows.length,
      1,
    );
    const payload = [
      alice,
      "Manutenção preventiva e corretiva",
      "Ponte rolante",
      "Avaliar o sistema de elevação e os freios.",
      "Empresa Alice",
      "Alice Silva",
      "alice@example.com",
      "11999999999",
      "Rua Industrial, 1",
    ];
    const insert =
      "insert into public.sr_quotes(user_id,service,equipment,description,company,contact_name,email,phone,address) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id";
    const quoteId = (await db.query(insert, payload)).rows[0].id;
    await assert.rejects(
      db.query(
        "insert into public.sr_quotes(user_id,service,equipment,description,company,contact_name,email,phone,address,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [...payload, "Concluído"],
      ),
      /permission denied/,
      "customer cannot set status at creation",
    );
    assert.equal(
      (await db.query("select * from public.sr_quote_events")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.sr_quotes set status='Concluído' where id=$1 returning id",
          [quoteId],
        )
      ).rows.length,
      0,
      "customer cannot act as admin even with user_metadata role",
    );
    await assert.rejects(
      db.query("update public.sr_profiles set email=$1 where id=$2", [
        "hijack@example.com",
        alice,
      ]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("update public.sr_quotes set user_id=$1 where id=$2", [
        bob,
        quoteId,
      ]),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into public.sr_quote_events(quote_id,status) values ($1,$2)",
        [quoteId, "Concluído"],
      ),
      /permission denied/,
    );
    await identity(bob);
    assert.equal(
      (await db.query("select * from public.sr_quotes")).rows.length,
      0,
      "other customer cannot read quotes",
    );
    assert.equal(
      (await db.query("select * from public.sr_quote_events")).rows.length,
      0,
      "other customer cannot read history",
    );
    await assert.rejects(
      db.query(insert, payload),
      /row-level security/,
      "cannot create a quote for another user",
    );
    await identity(bob, true);
    assert.equal(
      (await db.query("select * from public.sr_profiles")).rows.length,
      2,
    );
    await db.query(
      "update public.sr_quotes set status='Proposta enviada',amount=8500,notes='Proposta de teste' where id=$1",
      [quoteId],
    );
    assert.equal(
      (await db.query("select * from public.sr_quote_events")).rows.length,
      2,
      "status change creates history",
    );
    await db.query(
      "update public.sr_quotes set notes='Ajuste de condições' where id=$1",
      [quoteId],
    );
    assert.equal(
      (await db.query("select * from public.sr_quote_events")).rows.length,
      2,
      "unchanged status creates no duplicate",
    );
    await assert.rejects(
      db.query("update public.sr_quotes set amount=-1 where id=$1", [quoteId]),
      /check constraint/,
    );
    await identity(alice);
    assert.equal(
      (await db.query("select amount from public.sr_quotes")).rows[0].amount,
      "8500.00",
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(
      db.query("select * from public.sr_quotes"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from public.sr_profiles"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
