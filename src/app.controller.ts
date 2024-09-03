import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
// import { AppService } from './app.service';
import { User as UserModel, Post as PostModel } from '@prisma/client';

type Post = {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  content?: string;
  published: boolean;
  viewCount: number;
  author: {
    id: string;
    email: string;
    name?: string;
  };
  authorId?: string;
};

@Controller()
export class AppController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('post/:id')
  async getPostById(@Param('id') id: string): Promise<PostModel> {
    return this.prismaService.post.findUnique({ where: { id } });
  }

  @Get('feed')
  async getFilteredPosts(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('searchString') searchString?: string,
    @Query('orderBy') orderBy?: 'asc' | 'desc',
  ): Promise<PostModel[]> {
    const or = searchString
      ? {
          OR: [
            { title: { contains: searchString } },
            { content: { contains: searchString } },
          ],
        }
      : {};

    return this.prismaService.post.findMany({
      where: {
        published: true,
        ...or,
      },
      include: { author: true },
      take: Number(take) || undefined,
      skip: Number(skip) || undefined,
      orderBy: {
        updatedAt: orderBy,
      },
    });
  }

  @Get('users')
  async getAllUsers(): Promise<UserModel[]> {
    return this.prismaService.user.findMany();
  }

  @Get('user/:id/drafts')
  async getDraftsByUser(@Param('id') id: string): Promise<PostModel[]> {
    return this.prismaService.user
      .findUnique({
        where: { id },
      })
      .posts({
        where: {
          published: false,
        },
      });
  }

  @Post('post')
  async createDraft(
    @Body() postData: { title: string; content?: string; authorEmail: string },
  ): Promise<PostModel> {
    const { title, content, authorEmail } = postData;
    return this.prismaService.post.create({
      data: {
        title,
        content,
        author: {
          connect: { email: authorEmail },
        },
      },
    });
  }

  @Post('signup')
  async signupUser(
    @Body()
    userData: {
      name?: string;
      email: string;
      posts?: Post[];
    },
  ): Promise<UserModel> {
    const postData = userData.posts?.map((post) => {
      return { title: post?.title, content: post?.content };
    });
    return this.prismaService.user.create({
      data: {
        name: userData?.name,
        email: userData.email,
        posts: {
          create: postData,
        },
      },
    });
  }

  @Put('publish/:id')
  async togglePublishPost(@Param('id') id: string): Promise<PostModel> {
    const postData = await this.prismaService.post.findUnique({
      where: { id },
      select: {
        published: true,
      },
    });

    return this.prismaService.post.update({
      where: { id },
      data: { published: !postData?.published },
    });
  }

  @Delete('post/:id')
  async deletePost(@Param('id') id: string): Promise<PostModel> {
    return this.prismaService.post.delete({ where: { id } });
  }

  @Put('/post/:id/views')
  async incrementPostViewCount(@Param('id') id: string): Promise<PostModel> {
    return this.prismaService.post.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }
}