import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('users')
export class UsersController {
    @Get()
    public getUsers() {
        return "You sent a get request to users endpoint"
    }

    @Post()
    public postUsers(@Body() request: any) {
        console.log(request)
        return "You sent a post request to users endpoint"
    }
}
