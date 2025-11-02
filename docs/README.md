# 📚 AI Resource Optimizer Documentation

## 🎯 **Quick Start Guide**

### **For New Developers:**

1. 📋 **Start here:** [`ProjectBlueprint.md`](./ProjectBlueprint.md) - Complete system overview
2. 🏗️ **Architecture:** [`Architecture-Update.md`](./Architecture-Update.md) - Current vs legacy approaches
3. 📊 **Database:** [`Database-Model-Management.md`](./Database-Model-Management.md) - Model management guide
4. 📝 **Code Rules:** [`code_rules.md`](./code_rules.md) - Development standards

### **For Orchestration Development:**

1. 🌋 **Volcano SDK:** [`volcano_sdk_guide.md`](./volcano_sdk_guide.md) - Agent orchestration patterns
2. 🔧 **Integration:** [`IntegrationPlan.md`](./IntegrationPlan.md) - Legacy Volcano.dev integration

---

## 📖 **Documentation Index**

### **🏗️ Core Architecture**

| Document                                             | Purpose                      | Status     | Audience       |
| ---------------------------------------------------- | ---------------------------- | ---------- | -------------- |
| [`ProjectBlueprint.md`](./ProjectBlueprint.md)       | System overview & philosophy | ✅ Current | All developers |
| [`Architecture-Update.md`](./Architecture-Update.md) | New vs legacy architecture   | ✅ Current | All developers |
| [`code_rules.md`](./code_rules.md)                   | Development standards        | ✅ Current | All developers |

### **📊 Data Management**

| Document                                                         | Purpose                 | Status     | Audience           |
| ---------------------------------------------------------------- | ----------------------- | ---------- | ------------------ |
| [`Database-Model-Management.md`](./Database-Model-Management.md) | Database-first approach | ✅ Current | Backend developers |
| [`unified-model-management.md`](./unified-model-management.md)   | Unified model handling  | ✅ Current | Backend developers |

### **🌋 Orchestration & Integration**

| Document                                         | Purpose                        | Status     | Audience              |
| ------------------------------------------------ | ------------------------------ | ---------- | --------------------- |
| [`volcano_sdk_guide.md`](./volcano_sdk_guide.md) | Agent orchestration patterns   | ✅ Current | Agent developers      |
| [`IntegrationPlan.md`](./IntegrationPlan.md)     | Legacy Volcano.dev integration | ⚠️ Legacy  | Existing integrations |

### **🔧 Component Documentation**

| Document                                     | Purpose                    | Status     | Audience        |
| -------------------------------------------- | -------------------------- | ---------- | --------------- |
| [`ProviderManager.md`](./ProviderManager.md) | Provider management engine | ⚠️ Legacy  | Legacy users    |
| [`MCP_Contracts.md`](./MCP_Contracts.md)     | MCP API specifications     | ✅ Current | MCP developers  |
| [`CSEframework.md`](./CSEframework.md)       | Framework documentation    | ✅ Current | Framework users |

### **📋 Project Management**

| Document                                                               | Purpose             | Status     | Audience       |
| ---------------------------------------------------------------------- | ------------------- | ---------- | -------------- |
| [`Documentation-Update-Summary.md`](./Documentation-Update-Summary.md) | Recent doc changes  | ✅ Current | All developers |
| [`TODO.md`](./TODO.md)                                                 | Outstanding tasks   | ✅ Current | Project leads  |
| [`settings.md`](./settings.md)                                         | Configuration guide | ✅ Current | DevOps         |

---

## 🚀 **Current System Architecture**

### **Primary Architecture (Recommended)**

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   AI Providers  │ →  │   Database   │ →  │   Application   │
│  (OpenRouter,   │    │   (models    │    │   (Direct DB    │
│   AI Studio)    │    │    table)    │    │    Queries)     │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

**Benefits:** ⚡ Performance, 📊 Data consistency, 🔄 Offline operation

### **Legacy Architecture (Maintained)**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Volcano.dev   │ →  │ ArbitrageEngine  │ →  │   AI Providers  │
│   Workflows     │    │     Adapter      │    │   (Live APIs)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Use Cases:** 🔄 Legacy workflows, 🌋 Volcano.dev integration, 🔍 Real-time health checks

---

## 🎯 **Key Principles**

### **🔄 Exhaustive Fallbacks**

> "Try every free resource before giving up"

1. **Best Option First** - Choose optimal free model from healthy provider
2. **Intra-Provider Fallback** - Try next-best model from same provider
3. **Inter-Provider Fallback** - Try models from other providers
4. **Complete Exhaustion** - Only fail after all options attempted

### **🛡️ Development Standards**

- **TypeScript-First** - Strict typing for safety
- **Database-First** - Direct queries over API calls
- **Modular Design** - One responsibility per file/class
- **Comprehensive Testing** - Test both happy path and edge cases
- **Structured Logging** - JSON logging with correlation IDs

### **🌋 Orchestration Patterns**

- **Step-Only Testing** - Test patterns without roles first
- **Complex Workflows** - Parallel, branch, retry, loop patterns
- **Role Integration** - Combine roles with steps when stable

---

## 🔧 **Development Workflow**

### **For New Features:**

1. 📖 Read [`ProjectBlueprint.md`](./ProjectBlueprint.md) for context
2. 🏗️ Use database-first approach per [`Architecture-Update.md`](./Architecture-Update.md)
3. 📝 Follow [`code_rules.md`](./code_rules.md) standards
4. 🧪 Write tests using current patterns
5. 📊 Query unified `models` table directly

### **For Bug Fixes:**

1. 🔍 Check if issue is in legacy or current architecture
2. 📖 Refer to appropriate documentation section
3. 🛠️ Fix using established patterns
4. ✅ Ensure tests pass for both architectures if applicable

### **For Documentation Updates:**

1. 📝 Update relevant document(s)
2. 🔄 Update this index if structure changes
3. ✅ Mark status appropriately (✅ Current, ⚠️ Legacy, ❌ Deprecated)
4. 📋 Update [`Documentation-Update-Summary.md`](./Documentation-Update-Summary.md)

---

## 🆘 **Need Help?**

### **Architecture Questions:**

- 🏗️ New features: [`Architecture-Update.md`](./Architecture-Update.md)
- 🔄 Legacy integration: [`IntegrationPlan.md`](./IntegrationPlan.md)

### **Implementation Questions:**

- 📊 Database: [`Database-Model-Management.md`](./Database-Model-Management.md)
- 🌋 Orchestration: [`volcano_sdk_guide.md`](./volcano_sdk_guide.md)

### **Standards Questions:**

- 📝 Code style: [`code_rules.md`](./code_rules.md)
- 🎯 Philosophy: [`ProjectBlueprint.md`](./ProjectBlueprint.md)

---

## 📊 **Documentation Status Legend**

| Status        | Meaning                               | Action                  |
| ------------- | ------------------------------------- | ----------------------- |
| ✅ Current    | Up-to-date, actively maintained       | Use for new development |
| ⚠️ Legacy     | Maintained for backward compatibility | Use only if required    |
| ❌ Deprecated | No longer maintained                  | Migrate away from       |

---

_Last updated: November 2025 - Documentation aligned with current architecture_
