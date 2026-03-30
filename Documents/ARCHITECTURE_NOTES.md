# Architecture Notes

## Current Implementation Strategy (MVP)

**Use `IMPLEMENTATION_PLAN.md` for the current development focus.**

This simplified plan focuses on:
- ✅ Local microservices (no Docker/Kubernetes)
- ✅ File-based logging only
- ✅ Existing database tables (no new schemas)
- ✅ Direct service calls (no message queues)
- ✅ Simple pattern-based NLP (no machine learning)
- ✅ In-memory/file-based sessions (no Redis)

---

## Future Architecture Layers (Post-MVP)

The following represents the enterprise-scale architecture for after MVP:

### Infrastructure Layer (Future)
1. **Container Orchestration** - Kubernetes deployment with auto-scaling
2. **Service Mesh** - Istio or Linkerd for inter-service communication
3. **Message Queue** - RabbitMQ/Kafka for async event processing
4. **Caching Layer** - Redis for session and data caching
5. **Monitoring Stack** - Prometheus + Grafana for metrics
6. **Distributed Tracing** - Jaeger for troubleshooting

### Services to Separate (Future)
1. **Chat Service** - Conversation management
2. **Intent Service** - NLP-based intent classification
3. **Localization Service** - Multi-language support
4. **Event Service** - Event CRUD operations
5. **Session Service** - Session lifecycle management
6. **Notification Service** - User notifications
7. **Audit Service** - Compliance & logging

See `CHATBOT_ARCHITECTURE.md` for complete future architecture design.

---

## Current Deployment

Run all services in same process on local machine:
- Backend: `npm start` in `/backend`
- Frontend: `npm start` in `/frontend`
- All services share database connection
- Logging to text files in `/backend/logs`

---

## Migration Path

**Phase 1 (Current)**: Single Node.js process with all services
- ↓
**Phase 2 (Next)**: Separate Node services on localhost (different ports)
- ↓
**Phase 3**: Docker containers (local Docker)
- ↓
**Phase 4**: Kubernetes cluster
- ↓
**Phase 5**: Multi-region with message queues and service mesh

The code structure follows microservices patterns so migration is straightforward.
