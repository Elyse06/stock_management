from django.test import TestCase

from apps.employee.serializers import EmployerSerializer


class EmployerSerializerTests(TestCase):
	def test_create_generates_emp_id_when_not_provided(self):
		serializer = EmployerSerializer(
			data={
				"emp_nom": "Employé Test",
				"emp_matricule": "MAT-12345",
				"emp_fonction": "Agent",
				"emp_contact": "",
				"emp_serv_id": None,
			}
		)

		self.assertTrue(serializer.is_valid(), serializer.errors)
		employee = serializer.save()

		self.assertEqual(employee.emp_id, "E12345")
