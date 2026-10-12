-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('CUT', 'MAINTAIN', 'BULK');

-- CreateEnum
CREATE TYPE "Units" AS ENUM ('IMPERIAL', 'METRIC');

-- CreateEnum
CREATE TYPE "Meal" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "ExerciseKind" AS ENUM ('STRENGTH', 'CARDIO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "sex" "Sex",
    "birthDate" TIMESTAMP(3),
    "heightCm" DOUBLE PRECISION,
    "units" "Units" NOT NULL DEFAULT 'IMPERIAL',
    "goal" "Goal" NOT NULL DEFAULT 'MAINTAIN',
    "weeklyRateKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "goalWeightKg" DOUBLE PRECISION,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFood" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "servingDesc" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timesLogged" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedFood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "meal" "Meal" NOT NULL,
    "name" TEXT NOT NULL,
    "servingDesc" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savedFoodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "steps" INTEGER NOT NULL,

    CONSTRAINT "StepEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ExerciseKind" NOT NULL,
    "met" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMin" DOUBLE PRECISION NOT NULL,
    "caloriesBurned" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "reps" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "durationMin" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WeightEntry_userId_date_key" ON "WeightEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "SavedFood_userId_lastUsedAt_idx" ON "SavedFood"("userId", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedFood_userId_key_key" ON "SavedFood"("userId", "key");

-- CreateIndex
CREATE INDEX "FoodEntry_userId_date_idx" ON "FoodEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StepEntry_userId_date_key" ON "StepEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_userId_key_key" ON "Exercise"("userId", "key");

-- CreateIndex
CREATE INDEX "Workout_userId_date_idx" ON "Workout"("userId", "date");

-- AddForeignKey
ALTER TABLE "WeightEntry" ADD CONSTRAINT "WeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFood" ADD CONSTRAINT "SavedFood_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodEntry" ADD CONSTRAINT "FoodEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodEntry" ADD CONSTRAINT "FoodEntry_savedFoodId_fkey" FOREIGN KEY ("savedFoodId") REFERENCES "SavedFood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepEntry" ADD CONSTRAINT "StepEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
