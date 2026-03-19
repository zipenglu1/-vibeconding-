# Entities

Active frontend domain entity layer.

- `dataset` contains loaded data-source entry aliases.
- `project` contains persisted project metadata aliases.
- `field` contains semantic-query field and filter builder models.
- `chart` contains chart-facing frontend model types.
- `dashboard` contains dashboard-facing view models and metric shapes.

These entity modules are consumed by the workbench and dashboard flow so reusable domain models no longer live only inside feature modules.
