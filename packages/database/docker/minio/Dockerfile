# MinIO community images were removed. Compile immutable upstream source.
FROM golang:1.26.8-alpine@sha256:8ac98ca534ac3f51e1f420a1dd2c15e74c75cfa0f23f3ad27eb5d7236c349a0c AS build
ENV CGO_ENABLED=0
RUN go install github.com/minio/minio@7aac2a2c5b7c882e68c1ce017d8256be2feea27f
RUN go install github.com/minio/mc@77f82e18b5401a65958f1619df6ebb994634bd88

FROM alpine:3.23.4@sha256:5b10f432ef3da1b8d4c7eb6c487f2f5a8f096bc91145e68878dd4a5019afde11
RUN apk add --no-cache ca-certificates curl
COPY --from=build /go/bin/minio /go/bin/mc /usr/bin/
COPY --from=build /go/pkg/mod/github.com/minio/minio@*/LICENSE /licenses/minio-LICENSE
COPY --from=build /go/pkg/mod/github.com/minio/mc@*/LICENSE /licenses/mc-LICENSE
ENTRYPOINT ["minio"]
CMD ["server", "/data"]
