namespace api.DTOs;

public record PublicMetricDto(string DisplayValue);

public record PublicMoneyFlowDto(
    decimal ProgramsPct,
    decimal OperationsPct,
    decimal AdministrationPct
);
