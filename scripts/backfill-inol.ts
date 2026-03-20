import { PrismaClient } from '@prisma/client';
import { calculateINOL, calculateINOLByPattern, computeSessionTotals } from '../src/lib/math-engine';

const db = new PrismaClient();

async function main() {
  console.log('Fetching all training sessions...');
  const sessions = await db.trainingSession.findMany({
    where: {
      inolScore: 0
    }
  });

  console.log(`Found ${sessions.length} sessions with inolScore 0.`);

  let updatedCount = 0;
  for (const session of sessions) {
    try {
      if (!session.exercisesData) continue;
      
      const parsed = JSON.parse(session.exercisesData);
      const exercises = parsed.exercises;
      
      if (!exercises || !Array.isArray(exercises)) continue;

      const inolResult = calculateINOL(exercises);
      const inolByPattern = calculateINOLByPattern(exercises);
      const sessionTotals = computeSessionTotals(exercises);

      // Re-build exercisesData
      const newExercisesData = JSON.stringify({
        exercises,
        sessionTotals,
        inolBreakdown: inolResult.byExercise,
        inolByPattern: inolByPattern.byPattern,
      });

      await db.trainingSession.update({
        where: { id: session.id },
        data: {
          inolScore: inolResult.total,
          exercisesData: newExercisesData
        }
      });
      updatedCount++;
    } catch (e) {
      console.error(`Error processing session ${session.id}:`, e);
    }
  }

  console.log(`Updated ${updatedCount} sessions with correct INOL.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await db.$disconnect();
  });
