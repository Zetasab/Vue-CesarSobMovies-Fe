import { BaseEntity } from './BaseEntity'
import { MovieModel } from './MovieModel'

export class MoviePrivateUserListModel extends BaseEntity {
  ownerId: string
  movies: MovieModel[]

  constructor() {
    super()
    this.ownerId = ''
    this.movies = []
  }
}