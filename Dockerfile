FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o stivi.xyz .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/stivi.xyz .
COPY content/ content/
COPY web/ web/
EXPOSE 8080
CMD ["./stivi.xyz"]
