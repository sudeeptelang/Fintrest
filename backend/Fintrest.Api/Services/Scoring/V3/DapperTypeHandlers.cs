using System.Data;
using Dapper;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Dapper 2.1.35 still has no built-in handler for <see cref="DateOnly"/> and
/// <see cref="TimeOnly"/>. Register these once at startup so every Dapper call
/// in the backend (not just the feature store) can bind them to DATE / TIME
/// parameters correctly. Npgsql itself already supports these types — the
/// mapping just needs to be exposed to Dapper.
/// </summary>
public static class DapperTypeHandlers
{
    private static bool _registered;

    public static void Register()
    {
        if (_registered) return;
        SqlMapper.AddTypeHandler(new DateOnlyHandler());
        SqlMapper.AddTypeHandler(new NullableDateOnlyHandler());
        SqlMapper.AddTypeHandler(new TimeOnlyHandler());
        SqlMapper.AddTypeHandler(new NullableTimeOnlyHandler());
        _registered = true;
    }

    private class DateOnlyHandler : SqlMapper.TypeHandler<DateOnly>
    {
        public override void SetValue(IDbDataParameter parameter, DateOnly value)
        {
            parameter.DbType = DbType.Date;
            parameter.Value  = value.ToDateTime(TimeOnly.MinValue);
        }
        public override DateOnly Parse(object value) =>
            value is DateTime dt ? DateOnly.FromDateTime(dt)
            : value is DateOnly d ? d
            : DateOnly.Parse(value.ToString()!);
    }

    private class NullableDateOnlyHandler : SqlMapper.TypeHandler<DateOnly?>
    {
        public override void SetValue(IDbDataParameter parameter, DateOnly? value)
        {
            parameter.DbType = DbType.Date;
            parameter.Value  = value.HasValue
                ? value.Value.ToDateTime(TimeOnly.MinValue)
                : (object)DBNull.Value;
        }
        public override DateOnly? Parse(object value) =>
            value is null or DBNull        ? null
            : value is DateTime dt         ? DateOnly.FromDateTime(dt)
            : value is DateOnly d          ? d
            : DateOnly.Parse(value.ToString()!);
    }

    private class TimeOnlyHandler : SqlMapper.TypeHandler<TimeOnly>
    {
        public override void SetValue(IDbDataParameter parameter, TimeOnly value)
        {
            parameter.DbType = DbType.Time;
            parameter.Value  = value.ToTimeSpan();
        }
        public override TimeOnly Parse(object value) =>
            value is TimeSpan ts ? TimeOnly.FromTimeSpan(ts)
            : value is TimeOnly t ? t
            : TimeOnly.Parse(value.ToString()!);
    }

    private class NullableTimeOnlyHandler : SqlMapper.TypeHandler<TimeOnly?>
    {
        public override void SetValue(IDbDataParameter parameter, TimeOnly? value)
        {
            parameter.DbType = DbType.Time;
            parameter.Value  = value.HasValue ? (object)value.Value.ToTimeSpan() : DBNull.Value;
        }
        public override TimeOnly? Parse(object value) =>
            value is null or DBNull       ? null
            : value is TimeSpan ts        ? TimeOnly.FromTimeSpan(ts)
            : value is TimeOnly t         ? t
            : TimeOnly.Parse(value.ToString()!);
    }
}
