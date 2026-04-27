using Npgsql;

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: MigrateRunner <connection-string> <sql-file>");
    return 1;
}

var conn = args[0];
var sqlFile = args[1];

if (!File.Exists(sqlFile))
{
    Console.Error.WriteLine($"SQL file not found: {sqlFile}");
    return 2;
}

var sql = await File.ReadAllTextAsync(sqlFile);
Console.WriteLine($"Applying: {Path.GetFileName(sqlFile)} ({sql.Length} chars)");

await using var c = new NpgsqlConnection(conn);
await c.OpenAsync();
await using var cmd = new NpgsqlCommand(sql, c);
var rows = await cmd.ExecuteNonQueryAsync();
Console.WriteLine($"OK — affected rows: {rows}");

// Verify the table exists
await using var verify = new NpgsqlCommand(
    "SELECT to_regclass('public.signal_score_history')::text AS tbl", c);
var result = await verify.ExecuteScalarAsync();
Console.WriteLine($"Verification: signal_score_history = {result ?? "<null>"}");

return 0;
