from django.test import SimpleTestCase, TestCase
from django.urls import resolve

from apps.employee.serializers import DirectionSerializer, EmployerSerializer, ServiceSerializer
from apps.employee.models import Direction, Employer, Service, Site
from apps.employee.views_import import ImportEmployeesView


class EmployeeImportRouteTests(SimpleTestCase):
	def test_import_route_is_not_captured_by_employee_detail_route(self):
		match = resolve("/api/employee/employee/import/")

		self.assertIs(match.func.view_class, ImportEmployeesView)


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


class DirectionAndServiceIdTests(TestCase):
	def test_direction_ids_are_generated_sequentially(self):
		for index in range(1, 3):
			serializer = DirectionSerializer(
				data={"dir_libelle": f"Direction {index}", "dir_description": ""}
			)
			self.assertTrue(serializer.is_valid(), serializer.errors)
			self.assertEqual(serializer.save().dir_id, str(index))

	def test_service_ids_are_generated_sequentially(self):
		direction = DirectionSerializer(
			data={"dir_libelle": "Direction", "dir_description": ""}
		)
		self.assertTrue(direction.is_valid(), direction.errors)
		direction_id = direction.save().dir_id

		for index in range(1, 3):
			serializer = ServiceSerializer(
				data={
					"serv_libelle": f"Service {index}",
					"serv_info": "",
					"serv_dir_id": direction_id,
				}
			)
			self.assertTrue(serializer.is_valid(), serializer.errors)
			self.assertEqual(serializer.save().serv_id, str(index))


class EmployerOrganizationTests(TestCase):
	def test_employee_can_be_assigned_to_site_without_direction_or_service(self):
		site = Site.objects.create(
			site_nom="Siège", site_type="SIEGE", localite="Centre"
		)
		employer = Employer.objects.create(
			emp_nom="Direction générale",
			emp_matricule="MAT-DG",
			emp_fonction="Directeur général",
			emp_contact="",
			emp_site_id=site,
		)

		self.assertEqual(employer.emp_site_id, site)
		self.assertIsNone(employer.emp_dir_id)
		self.assertIsNone(employer.emp_serv_id)
		self.assertEqual(employer.site, site)

	def test_service_assignment_synchronizes_direction_and_site(self):
		site = Site.objects.create(
			site_nom="Agence", site_type="AGENCE", localite="Nord"
		)
		direction = Direction.objects.create(
			dir_libelle="Direction", dir_description="", site=site
		)
		service = Service.objects.create(
			serv_libelle="Service", serv_info="", serv_dir_id=direction
		)
		employer = Employer.objects.create(
			emp_nom="Employé",
			emp_matricule="MAT-EMP",
			emp_fonction="Agent",
			emp_contact="",
			emp_serv_id=service,
		)

		self.assertEqual(employer.emp_dir_id, direction)
		self.assertEqual(employer.emp_site_id, site)
