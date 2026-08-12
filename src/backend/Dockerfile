# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

ARG DOTNET_SDK_IMAGE=mcr.microsoft.com/dotnet/sdk:10.0@sha256:72dd743782f2ae7e5476fd64f6a460045e3998dc862218b80e6944cba79a01b0
ARG DOTNET_ASPNET_IMAGE=mcr.microsoft.com/dotnet/aspnet:10.0@sha256:f1126d438ccc359f51cc6d4701a8deae513856cf10f5fe645d29ea6403dcac6b
ARG VCS_REF=local

FROM ${DOTNET_SDK_IMAGE} AS restore
WORKDIR /src

COPY FluentA.Domain/FluentA.Domain.csproj FluentA.Domain/
COPY FluentA.Application/FluentA.Application.csproj FluentA.Application/
COPY FluentA.Infrastructure/FluentA.Infrastructure.csproj FluentA.Infrastructure/
COPY FluentA.API/FluentA.API.csproj FluentA.API/
RUN dotnet restore FluentA.API/FluentA.API.csproj --runtime linux-x64

FROM restore AS source
COPY FluentA.Domain/ FluentA.Domain/
COPY FluentA.Application/ FluentA.Application/
COPY FluentA.Infrastructure/ FluentA.Infrastructure/
COPY FluentA.API/ FluentA.API/

FROM source AS publish
RUN dotnet publish FluentA.API/FluentA.API.csproj \
    --configuration Release \
    --runtime linux-x64 \
    --self-contained false \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM source AS migration-build
ARG EF_TOOLS_VERSION=9.0.10
RUN dotnet tool install --tool-path /tools dotnet-ef --version ${EF_TOOLS_VERSION}
RUN /tools/dotnet-ef migrations bundle \
    --project FluentA.Infrastructure/FluentA.Infrastructure.csproj \
    --startup-project FluentA.API/FluentA.API.csproj \
    --configuration Release \
    --target-runtime linux-x64 \
    --output /app/migrations/efbundle \
    --no-color

FROM ${DOTNET_ASPNET_IMAGE} AS migrations
ARG VCS_REF
WORKDIR /app
ENV DOTNET_EnableDiagnostics=0
LABEL org.opencontainers.image.revision=$VCS_REF
COPY --from=migration-build /app/migrations/efbundle ./efbundle
USER $APP_UID
ENTRYPOINT ["./efbundle"]

FROM ${DOTNET_ASPNET_IMAGE} AS final
ARG VCS_REF
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0
EXPOSE 8080
LABEL org.opencontainers.image.revision=$VCS_REF
COPY --from=publish /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "FluentA.API.dll"]
