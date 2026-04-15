export abstract class BaseEntity {
  id: string
  createdUtc: Date
  updatedUtc?: Date

  protected constructor() {
    this.id = crypto.randomUUID()
    this.createdUtc = new Date()
    this.updatedUtc = undefined
  }
}