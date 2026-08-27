import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AuthModule } from './auth/auth.module';
import { BrainGameModule } from './brain-game/brain-game.module';
import { CatalogImportModule } from './catalog-import/catalog-import.module';
import { CurriculumAccessModule } from './curriculum-access/curriculum-access.module';
import { HealthModule } from './health/health.module';
import { MathematicsCatalogModule } from './mathematics-catalog/mathematics-catalog.module';
import { MathematicsTextbookModule } from './mathematics-textbooks/mathematics-textbook.module';
import { QuizGenerationModule } from './quiz-generation/quiz-generation.module';
import { SimulatorGenerationModule } from './simulator-generation/simulator-generation.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TextbooksModule } from './textbooks/textbooks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.cwd() ? `${process.cwd()}\\apps\\backend\\.env` : undefined,
        `${process.cwd()}\\.env`,
      ].filter(Boolean) as string[],
    }),
    HealthModule,
    AuthModule,
    BrainGameModule,
    UsersModule,
    AdminDashboardModule,
    SubjectsModule,
    CurriculumAccessModule,
    CatalogImportModule,
    TextbooksModule,
    QuizGenerationModule,
    SimulatorGenerationModule,
    MathematicsCatalogModule,
    MathematicsTextbookModule,
  ],
})
export class AppModule {}
