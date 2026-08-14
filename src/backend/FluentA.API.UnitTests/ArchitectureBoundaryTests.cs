using System.Reflection;
using FluentA.Application.Common;
using FluentA.Domain.SeedWork;
using FluentA.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.UnitTests;

public sealed class ArchitectureBoundaryTests
{
    private static readonly Assembly DomainAssembly = typeof(BaseEntity).Assembly;
    private static readonly Assembly ApplicationAssembly = typeof(OperationResult<>).Assembly;
    private static readonly Assembly InfrastructureAssembly = typeof(AppDbContext).Assembly;
    private static readonly Assembly ApiAssembly = typeof(Program).Assembly;

    [Fact]
    public void Production_project_references_follow_the_approved_dependency_direction()
    {
        AssertFluentAReferences(DomainAssembly);
        AssertFluentAReferences(ApplicationAssembly, "FluentA.Domain");
        AssertFluentAReferences(InfrastructureAssembly, "FluentA.Application", "FluentA.Domain");
        AssertFluentAReferences(ApiAssembly, "FluentA.Application", "FluentA.Infrastructure");
    }

    [Fact]
    public void Product_controller_persistence_exceptions_are_explicit_and_bounded()
    {
        var directPersistenceUsers = ApiAssembly
            .GetTypes()
            .Where(type => typeof(ControllerBase).IsAssignableFrom(type))
            .Where(type => type.Namespace == "FluentA.API.Controllers")
            .Where(UsesAppDbContextDirectly)
            .Select(type => type.FullName!)
            .OrderBy(name => name)
            .ToArray();

        Assert.Equal(
            [],
            directPersistenceUsers);
    }

    [Fact]
    public void Production_assemblies_do_not_reference_cqrs_or_mediatr_packages()
    {
        var productionAssemblies = new[]
        {
            DomainAssembly,
            ApplicationAssembly,
            InfrastructureAssembly,
            ApiAssembly
        };

        var forbiddenReferences = productionAssemblies
            .SelectMany(assembly => assembly.GetReferencedAssemblies())
            .Select(reference => reference.Name)
            .Where(name => name is "MediatR" or "MediatR.Contracts")
            .Distinct(StringComparer.Ordinal)
            .OrderBy(name => name)
            .ToArray();

        Assert.Empty(forbiddenReferences);
    }

    private static void AssertFluentAReferences(Assembly assembly, params string[] expected)
    {
        var actual = assembly
            .GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .Where(name => name?.StartsWith("FluentA.", StringComparison.Ordinal) == true)
            .Select(name => name!)
            .OrderBy(name => name)
            .ToArray();

        Assert.Equal(expected.OrderBy(name => name), actual);
    }

    private static bool UsesAppDbContextDirectly(Type controllerType)
    {
        var fieldTypes = controllerType
            .GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            .Select(field => field.FieldType);
        var constructorParameterTypes = controllerType
            .GetConstructors(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            .SelectMany(constructor => constructor.GetParameters().Select(parameter => parameter.ParameterType));

        return fieldTypes.Concat(constructorParameterTypes).Any(type => type == typeof(AppDbContext));
    }
}
