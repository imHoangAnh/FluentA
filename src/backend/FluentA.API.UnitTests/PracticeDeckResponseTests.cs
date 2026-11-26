using System.Text.Json;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.Common.Models;

namespace FluentA.API.UnitTests;

public sealed class PracticeDeckResponseTests
{
    [Fact]
    public void Paginated_decks_use_the_shared_response_fields()
    {
        var page = new PagedResult<PracticeDeckDto>
        {
            Items = [],
            PageNumber = 2,
            PageSize = 10,
            TotalItems = 21
        };

        var json = JsonSerializer.Serialize(ApiResponse<PagedResult<PracticeDeckDto>>.Ok(page),
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var document = JsonDocument.Parse(json);
        var data = document.RootElement.GetProperty("data");

        Assert.Equal(2, data.GetProperty("pageNumber").GetInt32());
        Assert.Equal(10, data.GetProperty("pageSize").GetInt32());
        Assert.Equal(21, data.GetProperty("totalItems").GetInt32());
        Assert.Equal(3, data.GetProperty("totalPages").GetInt32());
        Assert.Empty(data.GetProperty("items").EnumerateArray());
    }
}
