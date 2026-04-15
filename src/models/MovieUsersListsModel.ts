import { BaseEntity } from './BaseEntity'
import { MovieModel } from './MovieModel'

export class MovieUsersListsModel extends BaseEntity {
  name: string
  usersId: string[]
  movies: MovieModel[]

  constructor() {
    super()
    this.name = ''
    this.usersId = []
    this.movies = []
  }
}