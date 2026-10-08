FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN sh tools/build.sh

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/stivi.xyz .
COPY content/ content/
COPY --from=builder /app/web/dist/ web/dist/
EXPOSE 8080
CMD ["./stivi.xyz"]
